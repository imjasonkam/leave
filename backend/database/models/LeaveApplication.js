const knex = require('../../config/database');

const APPROVAL_STAGE_CONFIG = [
  { level: 'checker', idField: 'checker_id', timestampField: 'checker_at' },
  { level: 'approver_1', idField: 'approver_1_id', timestampField: 'approver_1_at' },
  { level: 'approver_2', idField: 'approver_2_id', timestampField: 'approver_2_at' },
  { level: 'approver_3', idField: 'approver_3_id', timestampField: 'approver_3_at' }
];

const determineCurrentApprovalStage = (application = {}) => {
  for (const stage of APPROVAL_STAGE_CONFIG) {
    const hasAssignee = application[stage.idField];
    const isCompleted = Boolean(application[stage.timestampField]);
    if (hasAssignee && !isCompleted) {
      return stage.level;
    }
  }
  return 'completed';
};

const withResolvedApprovalStage = (application) => {
  if (!application) {
    return application;
  }

  const resolvedStage =
    application.current_approval_stage || determineCurrentApprovalStage(application);

  return {
    ...application,
    current_approval_stage: resolvedStage
  };
};

const formatApplication = (application) => {
  if (!application) {
    return application;
  }

  const transactionId =
    application.transaction_id ||
    `LA-${String(application.id).padStart(6, '0')}`;

  const applicantNameZh =
    application.applicant_name_zh ||
    application.user_name_zh ||
    null;

  const applicantEmployeeNumber =
    application.applicant_employee_number ||
    application.user_employee_number ||
    null;

  const days =
    application.days !== undefined && application.days !== null
      ? application.days
      : application.total_days !== undefined && application.total_days !== null
        ? Number(application.total_days)
        : null;

  const approvalStage =
    application.current_approval_stage || determineCurrentApprovalStage(application);

  return {
    ...application,
    transaction_id: transactionId,
    applicant_name_zh: applicantNameZh,
    applicant_employee_number: applicantEmployeeNumber,
    days,
    current_approval_stage: approvalStage
  };
};

class LeaveApplication {
  static async create(applicationData) {
    const payload = {
      ...applicationData,
      current_approval_stage: determineCurrentApprovalStage(applicationData)
    };

    const [application] = await knex('leave_applications').insert(payload).returning('*');
    return await this.findById(application.id);
  }

  static async findById(id) {
    const application = await knex('leave_applications')
      .leftJoin('users', 'leave_applications.user_id', 'users.id')
      .leftJoin('leave_types', 'leave_applications.leave_type_id', 'leave_types.id')
      .leftJoin('users as checker', 'leave_applications.checker_id', 'checker.id')
      .leftJoin('users as approver_1', 'leave_applications.approver_1_id', 'approver_1.id')
      .leftJoin('users as approver_2', 'leave_applications.approver_2_id', 'approver_2.id')
      .leftJoin('users as approver_3', 'leave_applications.approver_3_id', 'approver_3.id')
      .leftJoin('users as rejected_by', 'leave_applications.rejected_by_id', 'rejected_by.id')
      .leftJoin('users as cancelled_by', 'leave_applications.cancelled_by_id', 'cancelled_by.id')
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
        'leave_types.requires_balance as leave_type_requires_balance',
        'checker.name_zh as checker_name',
        'approver_1.name_zh as approver_1_name',
        'approver_2.name_zh as approver_2_name',
        'approver_3.name_zh as approver_3_name',
        'rejected_by.name_zh as rejected_by_name',
        'cancelled_by.name_zh as cancelled_by_name'
      )
      .where('leave_applications.id', id)
      .first();
    
    if (application) {
      application.documents = await knex('leave_documents')
        .where('leave_application_id', id);
      
      // 查詢相關的 reverse transaction（銷假交易）
      // 查找所有 reversal_of_application_id 指向當前申請的銷假交易
      const reversalTransactions = await knex('leave_applications')
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
          'leave_types.name_zh as leave_type_name_zh'
        )
        .where('leave_applications.reversal_of_application_id', id)
        .where('leave_applications.is_reversal_transaction', true)
        .orderBy('leave_applications.created_at', 'desc');
      
      application.reversal_transactions = reversalTransactions.map(app => 
        formatApplication(withResolvedApprovalStage(app))
      );
    }
    
    return formatApplication(withResolvedApprovalStage(application));
  }

  static async findAll(options = {}) {
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
      );

    if (options.user_id) {
      query = query.where('leave_applications.user_id', options.user_id);
    }

    if (options.status) {
      query = query.where('leave_applications.status', options.status);
    }

    if (options.leave_type_id) {
      query = query.where('leave_applications.leave_type_id', options.leave_type_id);
    }

    if (options.flow_type) {
      query = query.where('leave_applications.flow_type', options.flow_type);
    }

    if (options.approver_id) {
      query = query.where(function() {
        this.where('leave_applications.checker_id', options.approver_id)
          .orWhere('leave_applications.approver_1_id', options.approver_id)
          .orWhere('leave_applications.approver_2_id', options.approver_id)
          .orWhere('leave_applications.approver_3_id', options.approver_id);
      });
    }

    if (options.is_cancellation_request !== undefined) {
      query = query.where('leave_applications.is_cancellation_request', options.is_cancellation_request);
    }

    const applications = await query.orderBy('leave_applications.created_at', 'desc');
    return applications.map(app => formatApplication(withResolvedApprovalStage(app)));
  }

  static async update(id, updateData) {
    await knex('leave_applications').where('id', id).update(updateData);
    await this.syncCurrentApprovalStage(id);
    return await this.findById(id);
  }

  static async syncCurrentApprovalStage(id) {
    const application = await knex('leave_applications')
      .select(
        'id',
        'checker_id',
        'checker_at',
        'approver_1_id',
        'approver_1_at',
        'approver_2_id',
        'approver_2_at',
        'approver_3_id',
        'approver_3_at',
        'current_approval_stage'
      )
      .where('id', id)
      .first();

    if (!application) {
      return null;
    }

    const resolvedStage = determineCurrentApprovalStage(application);

    if (application.current_approval_stage !== resolvedStage) {
      await knex('leave_applications')
        .where('id', id)
        .update({ current_approval_stage: resolvedStage });
    }

    return resolvedStage;
  }

  // 取得待批核的申請（針對特定使用者）
  static async getPendingApprovals(userId) {
    const DepartmentGroup = require('./DepartmentGroup');
    const DelegationGroup = require('./DelegationGroup');

    // 獲取所有待批核的申請
    const allApplications = await knex('leave_applications')
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
        'leave_types.name_zh as leave_type_name_zh'
      )
      .where('leave_applications.status', 'pending')
      .orderBy('leave_applications.created_at', 'asc');

    // 獲取當前用戶所屬的所有授權群組 ID
    const userDelegationGroups = await knex('delegation_groups')
      .whereRaw('? = ANY(delegation_groups.user_ids)', [Number(userId)])
      .select('id');

    const userDelegationGroupIds = userDelegationGroups.map(g => Number(g.id));

    // 過濾出當前用戶有權限批核的申請
    const filteredApplications = [];

    for (const app of allApplications) {
      let canApprove = false;

      // 方法1：檢查是否直接設置為批核者
      if (app.checker_id === userId ||
          app.approver_1_id === userId ||
          app.approver_2_id === userId ||
          app.approver_3_id === userId) {
        canApprove = true;
      } 
      // 方法2：檢查是否屬於對應的授權群組（特定部門群組）
      // 這個檢查對所有成員都應該執行，不僅僅是第一個成員
      if (!canApprove) {
        // 獲取申請人所屬的部門群組
        const departmentGroups = await DepartmentGroup.findByUserId(app.user_id);
        
        if (departmentGroups && departmentGroups.length > 0 && userDelegationGroupIds.length > 0) {
          // 使用第一個部門群組（與創建申請時的邏輯一致）
          const deptGroup = departmentGroups[0];
          
          // 獲取該部門群組的批核流程
          const approvalFlow = await DepartmentGroup.getApprovalFlow(deptGroup.id);
          
          // 檢查用戶是否屬於申請流程中任何階段的授權群組，且該階段尚未批核
          // 這樣可以讓所有授權群組成員都能看到他們將來需要批核的申請
          for (const step of approvalFlow) {
            if (step.delegation_group_id && userDelegationGroupIds.includes(Number(step.delegation_group_id))) {
              // 檢查該階段是否已設置且尚未批核
              // 使用多種可能的字段名稱來檢查（因為可能有不同的 migration 版本）
              let stepIsPending = false;
              
              if (step.level === 'checker') {
                // 檢查 checker 階段：checker_id 存在且尚未批核
                stepIsPending = !!(app.checker_id && app.checker_at == null && app.checked_at == null);
              } else if (step.level === 'approver_1') {
                // 檢查 approver_1 階段：approver_1_id 存在且尚未批核
                // 注意：approver_1_id 存儲的是授權群組中第一個成員的 ID
                // 但所有授權群組成員都應該能看到這個申請
                stepIsPending = !!(app.approver_1_id && app.approver_1_at == null && app.approved_1_at == null);
              } else if (step.level === 'approver_2') {
                // 檢查 approver_2 階段：approver_2_id 存在且尚未批核
                stepIsPending = !!(app.approver_2_id && app.approver_2_at == null && app.approved_2_at == null);
              } else if (step.level === 'approver_3') {
                // 檢查 approver_3 階段：approver_3_id 存在且尚未批核
                stepIsPending = !!(app.approver_3_id && app.approver_3_at == null && app.approved_3_at == null);
              }

              // 如果用戶屬於該階段的授權群組，且該階段尚未批核，允許查看
              if (stepIsPending) {
                canApprove = true;
                break; // 找到一個匹配的階段就可以退出循環
              }
            }
          }
        }
      }

      if (canApprove) {
        filteredApplications.push(app);
      }
    }

    return filteredApplications.map(formatApplication);
  }

  // 取得下一個批核者
  static async getNextApprover(applicationId) {
    const app = await knex('leave_applications')
      .where('id', applicationId)
      .first();
    
    if (!app) {
      return null;
    }

    // 檢查批核流程
    if (!app.checker_at && app.checker_id) {
      return { level: 'checker', user_id: app.checker_id };
    }
    
    if (!app.approver_1_at && app.approver_1_id) {
      return { level: 'approver_1', user_id: app.approver_1_id };
    }
    
    if (!app.approver_2_at && app.approver_2_id) {
      return { level: 'approver_2', user_id: app.approver_2_id };
    }
    
    if (!app.approver_3_at && app.approver_3_id) {
      return { level: 'approver_3', user_id: app.approver_3_id };
    }
    
    return null; // 所有批核已完成
  }

  // 批核申請
  static async approve(applicationId, approverId, level, remarks = null) {
    const updateData = {};
    updateData[`${level}_at`] = knex.fn.now();
    // 更新批核者ID為實際批核的用戶，確保記錄正確的批核者
    updateData[`${level}_id`] = approverId;
    if (remarks) {
      updateData[`${level}_remarks`] = remarks;
    }

    await knex('leave_applications')
      .where('id', applicationId)
      .update(updateData);

    // 檢查是否所有批核都已完成
    const nextApprover = await this.getNextApprover(applicationId);
    const stageUpdate = nextApprover ? nextApprover.level : 'completed';

    if (!nextApprover) {
      // 所有批核完成
      await knex('leave_applications')
        .where('id', applicationId)
        .update({
          status: 'approved',
          current_approval_stage: stageUpdate
        });
    } else {
      await knex('leave_applications')
        .where('id', applicationId)
        .update({ current_approval_stage: stageUpdate });
    }

    return await this.findById(applicationId);
  }

  // 拒絕申請
  static async reject(applicationId, rejectorId, reason) {
    await knex('leave_applications')
      .where('id', applicationId)
      .update({
        status: 'rejected',
        rejected_by_id: rejectorId,
        rejected_at: knex.fn.now(),
        rejection_reason: reason,
        current_approval_stage: 'completed'
      });

    return await this.findById(applicationId);
  }

  // 取消申請
  static async cancel(applicationId, cancelledById, reason) {
    await knex('leave_applications')
      .where('id', applicationId)
      .update({
        status: 'cancelled',
        cancelled_by_id: cancelledById,
        cancelled_at: knex.fn.now(),
        cancellation_reason: reason,
        current_approval_stage: 'completed'
      });

    return await this.findById(applicationId);
  }

  // 建立取消假期的申請
  static async createCancellationRequest(originalApplicationId, userId, reason) {
    const originalApp = await this.findById(originalApplicationId);
    if (!originalApp) {
      throw new Error('原始假期申請不存在');
    }

    if (originalApp.status !== 'approved') {
      throw new Error('只能取消已批准的假期');
    }

    // 取得使用者的部門群組和批核流程
    const DepartmentGroup = require('./DepartmentGroup');
    const userGroups = await DepartmentGroup.findByUserId(userId);
    
    let approvalFlow = null;
    if (userGroups && userGroups.length > 0) {
      approvalFlow = await DepartmentGroup.getApprovalFlow(userGroups[0].id);
    }

    const cancellationData = {
      user_id: userId,
      leave_type_id: originalApp.leave_type_id,
      start_date: originalApp.start_date,
      end_date: originalApp.end_date,
      total_days: originalApp.total_days,
      reason: reason,
      status: 'pending',
      flow_type: 'e-flow',
      is_cancellation_request: true,
      original_application_id: originalApplicationId
    };

    // 設定批核流程
    if (approvalFlow && approvalFlow.length > 0) {
      // 這裡需要根據 delegation groups 來分配具體的批核者
      // 暫時先設定為 null，實際使用時需要根據業務邏輯來分配
      for (const step of approvalFlow) {
        if (step.level === 'checker') {
          // 需要從 delegation group 中選擇一個批核者
          cancellationData.checker_id = null;
        } else {
          cancellationData[`${step.level}_id`] = null;
        }
      }
    }

    return await this.create(cancellationData);
  }

  static async createReversalRequest(originalApplicationId, userId, requestedByUserId = null, isHRDirectApproval = false) {
    const originalApp = await this.findById(originalApplicationId);
    if (!originalApp) {
      throw new Error('原始假期申請不存在');
    }

    if (originalApp.status !== 'approved') {
      throw new Error('只能銷假已批核的申請');
    }

    if (originalApp.is_reversed) {
      throw new Error('此申請已完成銷假');
    }

    // 檢查是否為 paper-flow 申請
    const isPaperFlow = originalApp.is_paper_flow === true || originalApp.flow_type === 'paper-flow';
    
    console.log('[createReversalRequest] 銷假申請參數:', {
      originalApplicationId,
      userId,
      isPaperFlow,
      isHRDirectApproval,
      originalStatus: originalApp.status
    });
    
    // 如果是 paper-flow 或 HR 直接批准，銷假申請直接批准
    if (isPaperFlow || isHRDirectApproval) {
      const reversalData = {
        user_id: originalApp.user_id, // 使用原始申請的 user_id
        leave_type_id: originalApp.leave_type_id,
        start_date: originalApp.start_date,
        end_date: originalApp.end_date,
        total_days: -Math.abs(Number(originalApp.total_days || 0)),
        reason: 'Reversal',
        status: 'approved', // 直接批准
        flow_type: isPaperFlow ? 'paper-flow' : 'e-flow',
        is_paper_flow: isPaperFlow,
        is_reversal_transaction: true,
        reversal_of_application_id: originalApplicationId,
        transaction_remark: 'Reversal - 銷假'
      };

      console.log('[createReversalRequest] 創建直接批准的銷假申請:', {
        status: reversalData.status,
        flow_type: reversalData.flow_type,
        is_paper_flow: reversalData.is_paper_flow
      });

      const reversalApplication = await this.create(reversalData);
      console.log('[createReversalRequest] 銷假申請創建成功，開始完成流程:', {
        id: reversalApplication.id,
        status: reversalApplication.status
      });
      
      // 直接完成銷假流程
      return await this.finalizeReversal(reversalApplication);
    }

    // e-flow 的處理邏輯
    const DepartmentGroup = require('./DepartmentGroup');
    const DelegationGroup = require('./DelegationGroup');

    const departmentGroups = await DepartmentGroup.findByUserId(userId);
    const reversalData = {
      user_id: userId,
      leave_type_id: originalApp.leave_type_id,
      start_date: originalApp.start_date,
      end_date: originalApp.end_date,
      total_days: -Math.abs(Number(originalApp.total_days || 0)),
      reason: 'Reversal',
      status: 'pending',
      flow_type: 'e-flow',
      is_reversal_transaction: true,
      reversal_of_application_id: originalApplicationId,
      transaction_remark: 'Reversal - 銷假'
    };

    if (departmentGroups && departmentGroups.length > 0) {
      const deptGroup = departmentGroups[0];
      const approvalFlow = await DepartmentGroup.getApprovalFlow(deptGroup.id);

      if (approvalFlow && approvalFlow.length > 0) {
        for (const step of approvalFlow) {
          if (!step.delegation_group_id) {
            continue;
          }
          const members = await DelegationGroup.getMembers(step.delegation_group_id);
          if (members && members.length > 0) {
            const approverId = members[0].id;
            if (step.level === 'checker') {
              reversalData.checker_id = approverId;
            } else {
              reversalData[`${step.level}_id`] = approverId;
            }
          }
        }
      } else {
        reversalData.status = 'approved';
      }
    } else {
      // 沒有部門群組時直接批准
      reversalData.status = 'approved';
    }

    const reversalApplication = await this.create(reversalData);
    if (reversalApplication.status === 'approved') {
      return await this.finalizeReversal(reversalApplication);
    }
    return reversalApplication;
  }

  static async finalizeReversal(application) {
    if (!application || !application.is_reversal_transaction) {
      return application;
    }

    const effectiveDays = Math.abs(Number(application.total_days || 0));

    if (application.reversal_of_application_id) {
      await knex('leave_applications')
        .where('id', application.reversal_of_application_id)
        .update({
          is_reversed: true,
          reversal_completed_at: knex.fn.now()
        });
    }

    if (effectiveDays > 0) {
      const LeaveBalance = require('./LeaveBalance');
      const LeaveType = require('./LeaveType');
      const leaveType = await LeaveType.findById(application.leave_type_id);

      if (leaveType && leaveType.requires_balance) {
        const year = application.start_date
          ? new Date(application.start_date).getFullYear()
          : new Date().getFullYear();

        await LeaveBalance.incrementBalance(
          application.user_id,
          application.leave_type_id,
          year,
          effectiveDays,
          '銷假 - Reversal'
        );
      }
    }

    return await this.findById(application.id);
  }
}

module.exports = LeaveApplication;
