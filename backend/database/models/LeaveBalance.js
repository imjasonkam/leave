const knex = require('../../config/database');
const LeaveBalanceTransaction = require('./LeaveBalanceTransaction');

class LeaveBalance {
  static async findByUserAndType(userId, leaveTypeId, year) {
    // 從交易記錄計算總餘額（所有交易記錄的總和）
    const totalBalance = await LeaveBalanceTransaction.getTotalBalance(userId, leaveTypeId, year);
    
    // 計算已使用的天數
    // 已使用 = 所有負數交易的絕對值總和 - 所有銷假相關的正數交易
    let taken = 0;
    try {
      // 計算所有負數交易（扣除餘額的交易）
      const usedResult = await knex('leave_balance_transactions')
        .where({
          user_id: userId,
          leave_type_id: leaveTypeId,
          year
        })
        .where('amount', '<', 0)
        .sum(knex.raw('ABS(amount)'))
        .first();
      
      let used = 0;
      const usedSum = usedResult?.sum || usedResult?.used;
      if (usedSum !== null && usedSum !== undefined) {
        used = parseFloat(usedSum);
      }

      // 計算所有銷假相關的正數交易（退回餘額的交易）
      const reversalResult = await knex('leave_balance_transactions')
        .where({
          user_id: userId,
          leave_type_id: leaveTypeId,
          year
        })
        .where('amount', '>', 0)
        .where(function() {
          this.where('remarks', 'like', '%銷假%')
            .orWhere('remarks', 'like', '%Reversal%')
            .orWhere('remarks', 'like', '%reversal%');
        })
        .sum('amount')
        .first();
      
      let reversed = 0;
      const reversedSum = reversalResult?.sum || reversalResult?.reversed;
      if (reversedSum !== null && reversedSum !== undefined) {
        reversed = parseFloat(reversedSum);
      }

      // 已使用 = 扣除的總額 - 退回的總額
      taken = Math.max(0, used - reversed);
    } catch (error) {
      console.error('Error calculating taken days:', error);
      // 如果表不存在，taken 保持為 0
    }
    const balance = totalBalance; // 可用餘額就是總餘額（因為扣除已經用負數記錄了）
    
    return {
      user_id: userId,
      leave_type_id: leaveTypeId,
      year,
      balance,
      taken,
      total: totalBalance
    };
  }

  static async findByUser(userId, year) {
    // 獲取所有假期類型
    const leaveTypes = await knex('leave_types')
      .where('requires_balance', true)
      .orderBy('name');
    
    // 為每個假期類型計算總餘額
    const balances = await Promise.all(
      leaveTypes.map(async (leaveType) => {
        const totalBalance = await LeaveBalanceTransaction.getTotalBalance(
          userId,
          leaveType.id,
          year
        );
        
        // 計算已使用的天數
        // 已使用 = 所有負數交易的絕對值總和 - 所有銷假相關的正數交易
        let taken = 0;
        try {
          // 計算所有負數交易（扣除餘額的交易）
          const usedResult = await knex('leave_balance_transactions')
            .where({
              user_id: userId,
              leave_type_id: leaveType.id,
              year
            })
            .where('amount', '<', 0)
            .sum(knex.raw('ABS(amount)'))
            .first();
          
          let used = 0;
          const usedSum = usedResult?.sum || usedResult?.used;
          if (usedSum !== null && usedSum !== undefined) {
            used = parseFloat(usedSum);
          }

          // 計算所有銷假相關的正數交易（退回餘額的交易）
          const reversalResult = await knex('leave_balance_transactions')
            .where({
              user_id: userId,
              leave_type_id: leaveType.id,
              year
            })
            .where('amount', '>', 0)
            .where(function() {
              this.where('remarks', 'like', '%銷假%')
                .orWhere('remarks', 'like', '%Reversal%')
                .orWhere('remarks', 'like', '%reversal%');
            })
            .sum('amount')
            .first();
          
          let reversed = 0;
          const reversedSum = reversalResult?.sum || reversalResult?.reversed;
          if (reversedSum !== null && reversedSum !== undefined) {
            reversed = parseFloat(reversedSum);
          }

          // 已使用 = 扣除的總額 - 退回的總額
          taken = Math.max(0, used - reversed);
        } catch (error) {
          console.error('Error calculating taken days:', error);
          // 如果表不存在，taken 保持為 0
        }
        const balance = totalBalance;
        
        return {
          user_id: userId,
          leave_type_id: leaveType.id,
          year,
          balance,
          taken,
          total: totalBalance,
          leave_type_code: leaveType.code,
          leave_type_name: leaveType.name,
          leave_type_name_zh: leaveType.name_zh,
          requires_balance: leaveType.requires_balance
        };
      })
    );
    
    // 過濾掉沒有交易記錄的假期類型
    return balances.filter(b => b.total !== 0 || b.taken > 0);
  }

  // 以下方法保留以保持向後兼容，但不再使用
  static async create(balanceData) {
    // 不再使用，改為使用交易記錄
    throw new Error('此方法已廢棄，請使用 LeaveBalanceTransaction.create');
  }

  static async update(id, balanceData) {
    // 不再使用，改為使用交易記錄
    throw new Error('此方法已廢棄，請使用 LeaveBalanceTransaction.create');
  }

  static async updateOrCreate(userId, leaveTypeId, year, balanceData) {
    // 不再使用，改為使用交易記錄
    throw new Error('此方法已廢棄，請使用 LeaveBalanceTransaction.create');
  }

  // 扣除餘額：創建負數交易記錄
  static async decrementBalance(userId, leaveTypeId, year, days, remarks = '假期申請已批准，扣除餘額', applicationStartDate = null, applicationEndDate = null) {
    // 檢查當前餘額是否足夠
    const currentBalance = await LeaveBalanceTransaction.getTotalBalance(userId, leaveTypeId, year);
    const daysToDeduct = parseFloat(days);
    
    if (currentBalance < daysToDeduct) {
      throw new Error('假期餘額不足');
    }

    // 如果提供了申請日期，檢查是否在有效期內
    if (applicationStartDate && applicationEndDate) {
      const validBalance = await LeaveBalanceTransaction.getValidBalanceForPeriod(
        userId, 
        leaveTypeId, 
        applicationStartDate, 
        applicationEndDate
      );
      
      if (validBalance < daysToDeduct) {
        throw new Error('申請日期超出假期餘額有效期範圍，可用餘額不足');
      }
    }

    // 創建負數交易記錄來扣除餘額
    // 扣除交易的有效期設定為申請期間（如果有提供）或當年度
    const transactionData = {
      user_id: userId,
      leave_type_id: leaveTypeId,
      year,
      amount: -daysToDeduct, // 負數表示扣除
      remarks,
      created_by_id: null, // 系統自動扣除
      start_date: applicationStartDate || `${year}-01-01`,
      end_date: applicationEndDate || `${year}-12-31`
    };

    await LeaveBalanceTransaction.create(transactionData);

    // 返回更新後的餘額信息
    return await this.findByUserAndType(userId, leaveTypeId, year);
  }

  // 增加餘額：創建正數交易記錄
  static async incrementBalance(userId, leaveTypeId, year, days, remarks = '假期申請被拒絕或取消，退回餘額', startDate = null, endDate = null) {
    const daysToAdd = parseFloat(days);
    
    // 創建正數交易記錄來增加餘額
    // 如果沒有提供有效期，使用整年度
    const transactionData = {
      user_id: userId,
      leave_type_id: leaveTypeId,
      year,
      amount: daysToAdd, // 正數表示增加
      remarks,
      created_by_id: null, // 系統自動退回
      start_date: startDate || `${year}-01-01`,
      end_date: endDate || `${year}-12-31`
    };

    await LeaveBalanceTransaction.create(transactionData);

    // 返回更新後的餘額信息
    return await this.findByUserAndType(userId, leaveTypeId, year);
  }
}

module.exports = LeaveBalance;
