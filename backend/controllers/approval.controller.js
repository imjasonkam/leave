const LeaveApplication = require('../database/models/LeaveApplication');
const LeaveBalance = require('../database/models/LeaveBalance');
const User = require('../database/models/User');
const knex = require('../config/database');

class ApprovalController {
  async approve(req, res) {
    try {
      const { id } = req.params;
      const { remarks, action, level } = req.body;

      const application = await LeaveApplication.findById(id);
      if (!application) {
        return res.status(404).json({ message: '申請不存在' });
      }

      if (application.status !== 'pending') {
        return res.status(400).json({ message: '此申請已處理' });
      }

      // 拒絕申請
      if (action === 'reject') {
        // HR Group 成員可以隨時拒絕申請（即使不是當前階段）
        const isHRMember = await User.isHRMember(req.user.id);
        if (!isHRMember) {
          // 非 HR Group 成員需要檢查是否有權限批核（只有當前階段的批核者才能拒絕）
          const canApprove = await User.canApprove(req.user.id, id);
          if (!canApprove) {
            return res.status(403).json({ message: '無權限進行此操作' });
          }
        }
        await LeaveApplication.reject(id, req.user.id, remarks || '已拒絕');
        return res.json({ message: '申請已拒絕' });
      }

      // 批准申請：檢查使用者是否有權限批核
      const canApprove = await User.canApprove(req.user.id, id);
      if (!canApprove) {
        return res.status(403).json({ message: '無權限進行此操作' });
      }

      // 批准申請
      if (action === 'approve') {
        // 優先檢查用戶是否為 HR Group 成員（全局權限）
        // HR Group 成員應該能夠批核所有申請的 approver_3 階段
        let currentLevel = null;
        if (application.approver_3_id && !application.approver_3_at) {
          const isHRMember = await User.isHRMember(req.user.id);
          if (isHRMember) {
            // 用戶是 HR Group 成員，設置為 approver_3
            currentLevel = 'approver_3';
          }
        }
        
        // 如果用戶不是 HR Group 成員，按照正常流程確定當前階段
        if (!currentLevel) {
          // 檢查用戶是否屬於特定部門群組的 approver_3 授權群組
          if (application.approver_3_id && !application.approver_3_at) {
            const DepartmentGroup = require('../database/models/DepartmentGroup');
            const departmentGroups = await DepartmentGroup.findByUserId(application.user_id);
            
            if (departmentGroups && departmentGroups.length > 0) {
              const deptGroup = departmentGroups[0];
              const approvalFlow = await DepartmentGroup.getApprovalFlow(deptGroup.id);
              const approver3Step = approvalFlow.find(step => step.level === 'approver_3');
              
              if (approver3Step && approver3Step.delegation_group_id) {
                const isInHRGroup = await knex('delegation_groups')
                  .where('id', approver3Step.delegation_group_id)
                  .whereRaw('? = ANY(delegation_groups.user_ids)', [Number(req.user.id)])
                  .first();
                
                if (isInHRGroup) {
                  // 用戶屬於 approver_3 的授權群組，設置為 approver_3
                  currentLevel = 'approver_3';
                }
              }
            }
          }
          
          // 如果還沒有確定階段，按照正常流程確定當前階段
          if (!currentLevel) {
            if (!application.checker_at && application.checker_id) {
              currentLevel = 'checker';
            } else if (!application.approver_1_at && application.approver_1_id) {
              currentLevel = 'approver_1';
            } else if (!application.approver_2_at && application.approver_2_id) {
              currentLevel = 'approver_2';
            } else if (!application.approver_3_at && application.approver_3_id) {
              currentLevel = 'approver_3';
            }
          }
        }

        // 如果提供了 level 參數，驗證是否匹配當前階段（可選，用於前端驗證）
        if (level && level !== currentLevel) {
          return res.status(400).json({ 
            message: `批核層級不匹配，當前需要批核的階段是：${currentLevel}` 
          });
        }

        if (!currentLevel) {
          return res.status(400).json({ message: '找不到需要批核的階段' });
        }

        // 執行批核（使用自動確定的階段）
        const updatedApplication = await LeaveApplication.approve(id, req.user.id, currentLevel, remarks);

        if (updatedApplication.status === 'approved') {
          if (updatedApplication.is_cancellation_request) {
            await LeaveApplication.cancel(
              updatedApplication.original_application_id,
              req.user.id,
              updatedApplication.reason
            );

            const leaveType = await require('../database/models/LeaveType').findById(updatedApplication.leave_type_id);
            if (leaveType && leaveType.requires_balance) {
              const currentYear = new Date().getFullYear();
              await LeaveBalance.incrementBalance(
                updatedApplication.user_id,
                updatedApplication.leave_type_id,
                currentYear,
                parseFloat(updatedApplication.total_days)
              );
            }
          } else if (updatedApplication.is_reversal_transaction) {
            updatedApplication = await LeaveApplication.finalizeReversal(updatedApplication);
          } else {
            const leaveType = await require('../database/models/LeaveType').findById(updatedApplication.leave_type_id);
            if (leaveType && leaveType.requires_balance) {
              const currentYear = new Date().getFullYear();
              await LeaveBalance.decrementBalance(
                updatedApplication.user_id,
                updatedApplication.leave_type_id,
                currentYear,
                parseFloat(updatedApplication.total_days)
              );
            }
          }
        }

        return res.json({
          message: updatedApplication.status === 'approved' ? '申請已完全批准' : '批核成功，等待下一層級批核',
          application: updatedApplication
        });
      }

      return res.status(400).json({ message: '無效的操作' });
    } catch (error) {
      console.error('Approve error:', error);
      res.status(500).json({ message: '批核時發生錯誤', error: error.message });
    }
  }

  async getPendingApprovals(req, res) {
    try {
      const applications = await LeaveApplication.getPendingApprovals(req.user.id);
      res.json({ applications });
    } catch (error) {
      console.error('Get pending approvals error:', error);
      res.status(500).json({ message: '獲取待批核申請時發生錯誤' });
    }
  }

  async getApprovalHistory(req, res) {
    try {
      const { status } = req.query;
      const userId = req.user.id;
      
      // 獲取所有已處理的申請（不包括待批核的）
      let query = knex('leave_applications')
        .leftJoin('users', 'leave_applications.user_id', 'users.id')
        .leftJoin('leave_types', 'leave_applications.leave_type_id', 'leave_types.id')
        .select(
          'leave_applications.*',
          knex.raw('leave_applications.total_days as days'),
          knex.raw('leave_applications.id as transaction_id'),
          'users.employee_number as user_employee_number',
          'users.employee_number as applicant_employee_number',
          'users.surname as user_surname',
          'users.given_name as user_given_name',
          'users.name_zh as user_name_zh',
          'users.name_zh as applicant_name_zh',
          'leave_types.code as leave_type_code',
          'leave_types.name as leave_type_name',
          'leave_types.name_zh as leave_type_name_zh',
          'leave_types.requires_balance as leave_type_requires_balance'
        )
        .where('leave_applications.status', '!=', 'pending');

      if (status && status !== 'all') {
        query = query.where('leave_applications.status', status);
      }

      const allApplications = await query.orderBy('leave_applications.created_at', 'desc');
      
      // 獲取用戶所屬的授權群組
      const userDelegationGroups = await knex('delegation_groups')
        .whereRaw('? = ANY(delegation_groups.user_ids)', [Number(userId)])
        .select('id');
      
      const userDelegationGroupIds = userDelegationGroups.map(g => Number(g.id));
      
      // 過濾出用戶批核過的申請
      const DepartmentGroup = require('../database/models/DepartmentGroup');
      const User = require('../database/models/User');
      const isHRMember = await User.isHRMember(userId);
      const processedApplications = [];
      
      console.log(`[getApprovalHistory] 開始處理，總申請數: ${allApplications.length}, 用戶ID: ${userId}, 是否HR成員: ${isHRMember}`);
      
      // 調試：檢查是否有 paper-flow 申請
      const paperFlowApps = allApplications.filter(app => app.is_paper_flow === true || app.flow_type === 'paper-flow');
      console.log(`[getApprovalHistory] 發現 ${paperFlowApps.length} 個 paper-flow 申請:`, 
        paperFlowApps.map(app => ({
          id: app.id,
          transaction_id: app.transaction_id,
          is_paper_flow: app.is_paper_flow,
          flow_type: app.flow_type,
          status: app.status
        }))
      );
      
      for (const app of allApplications) {
        let isApprover = false;
        
        // 方法1：檢查是否直接設置為批核者
        if ((app.checker_id === userId && app.checker_at) ||
            (app.approver_1_id === userId && app.approver_1_at) ||
            (app.approver_2_id === userId && app.approver_2_at) ||
            (app.approver_3_id === userId && app.approver_3_at) ||
            app.rejected_by_id === userId) {
          isApprover = true;
        }
        
        // 方法2：檢查是否為 paper-flow 且用戶是 HR Group 成員
        // paper-flow 申請由 HR Group 獲授權人提交後自動批准，應該顯示在批核記錄中
        // 同時檢查 is_paper_flow 欄位和 flow_type 欄位（以防欄位未正確設置）
        const isPaperFlow = app.is_paper_flow === true || app.flow_type === 'paper-flow';
        
        // 調試：記錄所有 paper-flow 申請
        if (isPaperFlow) {
          console.log(`[getApprovalHistory] 發現 paper-flow 申請:`, {
            applicationId: app.id,
            transaction_id: app.transaction_id,
            is_paper_flow: app.is_paper_flow,
            flow_type: app.flow_type,
            status: app.status,
            userId,
            isHRMember,
            currentIsApprover: isApprover
          });
        }
        
        if (!isApprover && isPaperFlow && app.status === 'approved' && isHRMember) {
          isApprover = true;
          console.log(`[getApprovalHistory] Paper-flow 申請匹配並加入批核記錄:`, {
            applicationId: app.id,
            transaction_id: app.transaction_id,
            is_paper_flow: app.is_paper_flow,
            flow_type: app.flow_type,
            status: app.status,
            userId,
            isHRMember
          });
        }
        
        // 方法3：檢查是否通過授權群組批核過
        if (!isApprover && userDelegationGroupIds.length > 0) {
          const departmentGroups = await DepartmentGroup.findByUserId(app.user_id);
          if (departmentGroups && departmentGroups.length > 0) {
            const deptGroup = departmentGroups[0];
            const approvalFlow = await DepartmentGroup.getApprovalFlow(deptGroup.id);
            
            for (const step of approvalFlow) {
              if (step.delegation_group_id && userDelegationGroupIds.includes(Number(step.delegation_group_id))) {
                // 檢查該階段是否已批核
                let stepApproved = false;
                if (step.level === 'checker' && app.checker_at) {
                  stepApproved = true;
                } else if (step.level === 'approver_1' && app.approver_1_at) {
                  stepApproved = true;
                } else if (step.level === 'approver_2' && app.approver_2_at) {
                  stepApproved = true;
                } else if (step.level === 'approver_3' && app.approver_3_at) {
                  stepApproved = true;
                }
                
                if (stepApproved) {
                  isApprover = true;
                  break;
                }
              }
            }
          }
        }
        
        if (isApprover) {
          processedApplications.push(app);
        }
      }

      // 格式化申請數據（使用 LeaveApplication 的 formatApplication 函數）
      const LeaveApplicationModel = require('../database/models/LeaveApplication');
      const formattedApplications = processedApplications.map(app => {
        // formatApplication 是模塊級函數，需要通過其他方式訪問
        // 暫時直接返回，因為數據已經包含所需字段
        const isPaperFlow = app.is_paper_flow === true || app.flow_type === 'paper-flow';
        return {
          ...app,
          transaction_id: app.transaction_id || `LA-${String(app.id).padStart(6, '0')}`,
          applicant_name_zh: app.applicant_name_zh || app.user_name_zh,
          days: app.days !== undefined && app.days !== null ? app.days : app.total_days,
          is_paper_flow: isPaperFlow // 確保前端能正確識別
        };
      });

      console.log(`[getApprovalHistory] 最終返回 ${formattedApplications.length} 個申請，其中 paper-flow: ${formattedApplications.filter(a => a.is_paper_flow).length} 個`);

      res.json({ applications: formattedApplications });
    } catch (error) {
      console.error('Get approval history error:', error);
      res.status(500).json({ message: '獲取批核記錄時發生錯誤' });
    }
  }
}

module.exports = new ApprovalController();
