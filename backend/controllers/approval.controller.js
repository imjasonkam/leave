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

      // 檢查使用者是否有權限批核
      const canApprove = await User.canApprove(req.user.id, id);
      if (!canApprove) {
        return res.status(403).json({ message: '無權限進行此操作' });
      }

      // 拒絕申請
      if (action === 'reject') {
        await LeaveApplication.reject(id, req.user.id, remarks || '已拒絕');
        return res.json({ message: '申請已拒絕' });
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

        // 如果是取消假期的申請且已完全批准，更新原始申請的狀態
        if (updatedApplication.status === 'approved' && updatedApplication.is_cancellation_request) {
          await LeaveApplication.cancel(
            updatedApplication.original_application_id,
            req.user.id,
            updatedApplication.reason
          );

          // 退回假期餘額
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
        }

        // 如果是一般假期申請且已完全批准，扣除假期餘額
        if (updatedApplication.status === 'approved' && !updatedApplication.is_cancellation_request) {
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
      const options = {
        approver_id: req.user.id
      };

      if (status && status !== 'pending') {
        options.status = status;
      }

      const applications = await LeaveApplication.findAll(options);
      
      // 過濾出已處理的申請
      const processedApplications = applications.filter(app => {
        if (app.status === 'pending') return false;
        
        // 檢查使用者是否參與了批核
        return app.checker_id === req.user.id && app.checker_at ||
               app.approver_1_id === req.user.id && app.approver_1_at ||
               app.approver_2_id === req.user.id && app.approver_2_at ||
               app.approver_3_id === req.user.id && app.approver_3_at ||
               app.rejected_by_id === req.user.id;
      });

      res.json({ applications: processedApplications });
    } catch (error) {
      console.error('Get approval history error:', error);
      res.status(500).json({ message: '獲取批核記錄時發生錯誤' });
    }
  }
}

module.exports = new ApprovalController();
