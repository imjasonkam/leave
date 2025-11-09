const LeaveApplication = require('../database/models/LeaveApplication');
const LeaveBalance = require('../database/models/LeaveBalance');
const LeaveDocument = require('../database/models/LeaveDocument');
const LeaveType = require('../database/models/LeaveType');
const User = require('../database/models/User');
const DepartmentGroup = require('../database/models/DepartmentGroup');
const DelegationGroup = require('../database/models/DelegationGroup');
const path = require('path');

class LeaveController {
  async createApplication(req, res) {
    try {
      const { start_date, end_date, total_days, leave_type_id, reason, user_id, flow_type } = req.body;
      const applied_by_id = req.user.id;

      if (!start_date || !end_date || !total_days || !leave_type_id) {
        return res.status(400).json({ message: '請填寫所有必填欄位' });
      }

      // 如果是 paper-flow，檢查權限
      if (flow_type === 'paper-flow') {
        const isHRMember = await User.isHRMember(applied_by_id);
        if (!isHRMember) {
          return res.status(403).json({ message: '只有系統管理員可以使用 Paper Flow' });
        }
        if (!user_id) {
          return res.status(400).json({ message: 'Paper Flow 必須指定申請人' });
        }
      }

      const leaveType = await LeaveType.findById(leave_type_id);
      if (!leaveType) {
        return res.status(404).json({ message: '假期類型不存在' });
      }

      const applicantId = user_id || req.user.id;
      const applicant = await User.findById(applicantId);
      if (!applicant) {
        return res.status(404).json({ message: '申請人不存在' });
      }

      // 決定流程類型：明確指定 paper-flow 才使用，否則一律走 e-flow
      const actualFlowType = flow_type === 'paper-flow' ? 'paper-flow' : 'e-flow';

      const currentYear = new Date().getFullYear();

      let balanceRecord = null;

      // 檢查假期餘額
      if (leaveType.requires_balance) {
        balanceRecord = await LeaveBalance.findByUserAndType(applicantId, leave_type_id, currentYear);
        
        if (!balanceRecord || parseFloat(balanceRecord.balance) < parseFloat(total_days)) {
          return res.status(400).json({ message: '假期餘額不足' });
        }
      }

      const applicationData = {
        user_id: applicantId,
        leave_type_id,
        start_date,
        end_date,
        total_days: parseFloat(total_days),
        reason: reason || null,
        status: actualFlowType === 'paper-flow' ? 'approved' : 'pending',
        flow_type: actualFlowType
      };

      // 如果是 e-flow，設定批核流程
      if (actualFlowType === 'e-flow') {
        // 取得使用者所屬的部門群組
        const departmentGroups = await DepartmentGroup.findByUserId(applicantId);
        
        if (departmentGroups && departmentGroups.length > 0) {
          const deptGroup = departmentGroups[0]; // 使用第一個部門群組
          
          // 取得批核流程
          const approvalFlow = await DepartmentGroup.getApprovalFlow(deptGroup.id);
          
          if (approvalFlow.length === 0) {
            // 如果沒有設定任何批核者，自動批准
            applicationData.status = 'approved';
          } else {
            // 從每個 delegation group 中選擇第一個成員作為批核者
            for (const step of approvalFlow) {
              const delegationGroupId = step.delegation_group_id;
              if (delegationGroupId) {
                const members = await DelegationGroup.getMembers(delegationGroupId);
                if (members && members.length > 0) {
                  // 選擇第一個成員作為批核者
                  const approverId = members[0].id;
                  if (step.level === 'checker') {
                    applicationData.checker_id = approverId;
                  } else {
                    applicationData[`${step.level}_id`] = approverId;
                  }
                }
              }
            }
          }
        } else {
          // 如果使用者不屬於任何部門群組，自動批准
          applicationData.status = 'approved';
        }
      }

      const application = await LeaveApplication.create(applicationData);

      // 如果是 paper-flow 已批准的申請，立即更新假期餘額
      if (application.status === 'approved' && actualFlowType === 'paper-flow' && leaveType.requires_balance) {
        if (!balanceRecord) {
          throw new Error('找不到假期餘額紀錄');
        }

        await LeaveBalance.decrementBalance(
          applicantId,
          leave_type_id,
          currentYear,
          parseFloat(total_days)
        );
      }
      
      // e-flow 申請會在批核完成後才扣除餘額

      res.status(201).json({
        message: '假期申請已提交',
        application
      });
    } catch (error) {
      console.error('Create application error:', error);
      res.status(500).json({ message: '建立申請時發生錯誤', error: error.message });
    }
  }

  async getApplications(req, res) {
    try {
      const {
        status,
        leave_type_id,
        flow_type,
        user_id,
        applicant_id,
        include_approver
      } = req.query;
      
      const options = {};
      if (status) options.status = status;
      if (leave_type_id) options.leave_type_id = leave_type_id;
      if (flow_type) options.flow_type = flow_type;
      
      // 檢查是否為 HR 成員
      const isHRMember = await User.isHRMember(req.user.id);
      const requestedUserId = user_id || applicant_id;
      const includeApproverView = include_approver === 'true';
      
      if (requestedUserId) {
        options.user_id = requestedUserId;
      } else if (!isHRMember) {
        // 一般使用者預設僅能查看自己的申請
        options.user_id = req.user.id;
      }

      if (includeApproverView) {
        options.approver_id = req.user.id;
      }

      const applications = await LeaveApplication.findAll(options);

      res.json({ applications });
    } catch (error) {
      console.error('Get applications error:', error);
      res.status(500).json({ message: '獲取申請列表時發生錯誤' });
    }
  }

  async getApplicationById(req, res) {
    try {
      const { id } = req.params;
      const application = await LeaveApplication.findById(id);

      if (!application) {
        return res.status(404).json({ message: '申請不存在' });
      }

      // 檢查權限
      const isHRMember = await User.isHRMember(req.user.id);
      const isApplicant = application.user_id === req.user.id;
      const isApprover = [
        application.checker_id, 
        application.approver_1_id, 
        application.approver_2_id, 
        application.approver_3_id
      ].includes(req.user.id);

      if (!isHRMember && !isApplicant && !isApprover) {
        return res.status(403).json({ message: '無權限查看此申請' });
      }

      res.json({ application });
    } catch (error) {
      console.error('Get application error:', error);
      res.status(500).json({ message: '獲取申請詳情時發生錯誤' });
    }
  }

  async uploadDocument(req, res) {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: '請選擇檔案' });
      }

      const application = await LeaveApplication.findById(id);
      if (!application) {
        return res.status(404).json({ message: '申請不存在' });
      }

      const isApplicant = application.user_id === req.user.id;
      const isHRMember = await User.isHRMember(req.user.id);

      if (!isApplicant && !isHRMember) {
        return res.status(403).json({ message: '無權限上載檔案到此申請' });
      }

      const documentData = {
        leave_application_id: id,
        file_name: file.originalname,
        file_path: file.path,
        file_type: file.mimetype,
        file_size: file.size,
        uploaded_by_id: req.user.id
      };

      const document = await LeaveDocument.create(documentData);

      res.status(201).json({
        message: '檔案上載成功',
        document
      });
    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({ message: '上載檔案時發生錯誤' });
    }
  }

  async getDocuments(req, res) {
    try {
      const { id } = req.params;
      const documents = await LeaveDocument.findByApplicationId(id);

      res.json({ documents });
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ message: '獲取檔案列表時發生錯誤' });
    }
  }

  async getBalances(req, res) {
    try {
      const { user_id, year } = req.query;
      const userId = user_id || req.user.id;
      const currentYear = year || new Date().getFullYear();

      // 檢查權限
      const isHRMember = await User.isHRMember(req.user.id);

      if (!isHRMember && userId !== req.user.id.toString()) {
        return res.status(403).json({ message: '無權限查看其他用戶的假期餘額' });
      }

      const balances = await LeaveBalance.findByUser(userId, currentYear);

      res.json({ balances, year: currentYear });
    } catch (error) {
      console.error('Get balances error:', error);
      res.status(500).json({ message: '獲取假期餘額時發生錯誤' });
    }
  }

  // 申請取消假期
  async requestCancellation(req, res) {
    try {
      const { application_id, reason } = req.body;

      if (!application_id || !reason) {
        return res.status(400).json({ message: '請提供原始申請 ID 和取消原因' });
      }

      const cancellationRequest = await LeaveApplication.createCancellationRequest(
        application_id,
        req.user.id,
        reason
      );

      res.status(201).json({
        message: '取消假期申請已提交',
        application: cancellationRequest
      });
    } catch (error) {
      console.error('Request cancellation error:', error);
      res.status(500).json({ 
        message: error.message || '建立取消申請時發生錯誤',
        error: error.message 
      });
    }
  }

  // 取得待批核的申請
  async getPendingApprovals(req, res) {
    try {
      const applications = await LeaveApplication.getPendingApprovals(req.user.id);
      res.json({ applications });
    } catch (error) {
      console.error('Get pending approvals error:', error);
      res.status(500).json({ message: '獲取待批核申請時發生錯誤' });
    }
  }
}

module.exports = new LeaveController();
