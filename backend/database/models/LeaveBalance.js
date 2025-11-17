const knex = require('../../config/database');
const LeaveBalanceTransaction = require('./LeaveBalanceTransaction');

class LeaveBalance {
  static async findByUserAndType(userId, leaveTypeId, year) {
    // 從交易記錄計算總餘額（所有交易記錄的總和）
    const totalBalance = await LeaveBalanceTransaction.getTotalBalance(userId, leaveTypeId, year);
    
    // 計算已使用的天數（所有負數交易的絕對值總和）
    let taken = 0;
    try {
      const usedResult = await knex('leave_balance_transactions')
        .where({
          user_id: userId,
          leave_type_id: leaveTypeId,
          year
        })
        .where('amount', '<', 0)
        .sum(knex.raw('ABS(amount) as used'))
        .first();
      
      const used = usedResult?.used;
      if (used !== null && used !== undefined) {
        taken = parseFloat(used);
      }
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
        let taken = 0;
        try {
          const usedResult = await knex('leave_balance_transactions')
            .where({
              user_id: userId,
              leave_type_id: leaveType.id,
              year
            })
            .where('amount', '<', 0)
            .sum(knex.raw('ABS(amount) as used'))
            .first();
          
          const used = usedResult?.used;
          if (used !== null && used !== undefined) {
            taken = parseFloat(used);
          }
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
  static async decrementBalance(userId, leaveTypeId, year, days, remarks = '假期申請已批准，扣除餘額') {
    // 檢查當前餘額是否足夠
    const currentBalance = await LeaveBalanceTransaction.getTotalBalance(userId, leaveTypeId, year);
    const daysToDeduct = parseFloat(days);
    
    if (currentBalance < daysToDeduct) {
      throw new Error('Insufficient leave balance');
    }

    // 創建負數交易記錄來扣除餘額
    await LeaveBalanceTransaction.create({
      user_id: userId,
      leave_type_id: leaveTypeId,
      year,
      amount: -daysToDeduct, // 負數表示扣除
      remarks,
      created_by_id: null // 系統自動扣除
    });

    // 返回更新後的餘額信息
    return await this.findByUserAndType(userId, leaveTypeId, year);
  }

  // 增加餘額：創建正數交易記錄
  static async incrementBalance(userId, leaveTypeId, year, days, remarks = '假期申請被拒絕或取消，退回餘額') {
    const daysToAdd = parseFloat(days);
    
    // 創建正數交易記錄來增加餘額
    await LeaveBalanceTransaction.create({
      user_id: userId,
      leave_type_id: leaveTypeId,
      year,
      amount: daysToAdd, // 正數表示增加
      remarks,
      created_by_id: null // 系統自動退回
    });

    // 返回更新後的餘額信息
    return await this.findByUserAndType(userId, leaveTypeId, year);
  }
}

module.exports = LeaveBalance;
