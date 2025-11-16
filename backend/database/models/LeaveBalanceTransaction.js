const knex = require('../../config/database');

class LeaveBalanceTransaction {
  static async create(transactionData) {
    try {
      const [transaction] = await knex('leave_balance_transactions')
        .insert(transactionData)
        .returning('*');
      return transaction;
    } catch (error) {
      console.error('LeaveBalanceTransaction.create error:', error);
      throw error;
    }
  }

  static async findByUserAndType(userId, leaveTypeId, year) {
    try {
      return await knex('leave_balance_transactions')
        .leftJoin('users as creator', 'leave_balance_transactions.created_by_id', 'creator.id')
        .select(
          'leave_balance_transactions.*',
          'creator.name_zh as created_by_name',
          'creator.employee_number as created_by_employee_number'
        )
        .where({
          user_id: userId,
          leave_type_id: leaveTypeId,
          year
        })
        .orderBy('leave_balance_transactions.created_at', 'desc');
    } catch (error) {
      console.error('findByUserAndType error:', error);
      // 如果表不存在，返回空數組
      if (error.message && error.message.includes('does not exist')) {
        return [];
      }
      throw error;
    }
  }

  static async findByUser(userId, year) {
    try {
      return await knex('leave_balance_transactions')
        .leftJoin('leave_types', 'leave_balance_transactions.leave_type_id', 'leave_types.id')
        .leftJoin('users as creator', 'leave_balance_transactions.created_by_id', 'creator.id')
        .select(
          'leave_balance_transactions.*',
          'leave_types.code as leave_type_code',
          'leave_types.name_zh as leave_type_name_zh',
          'creator.name_zh as created_by_name',
          'creator.employee_number as created_by_employee_number'
        )
        .where({
          user_id: userId,
          year
        })
        .orderBy('leave_balance_transactions.created_at', 'desc');
    } catch (error) {
      console.error('findByUser error:', error);
      // 如果表不存在，返回空數組
      if (error.message && error.message.includes('does not exist')) {
        return [];
      }
      throw error;
    }
  }

  static async getTotalBalance(userId, leaveTypeId, year) {
    try {
      const result = await knex('leave_balance_transactions')
        .where({
          user_id: userId,
          leave_type_id: leaveTypeId,
          year
        })
        .sum('amount as total')
        .first();
      
      // PostgreSQL 的 sum 在沒有記錄時返回 null
      const total = result?.total;
      if (total === null || total === undefined) {
        return 0;
      }
      return parseFloat(total);
    } catch (error) {
      console.error('getTotalBalance error:', error);
      // 如果表不存在，返回 0
      if (error.message && error.message.includes('does not exist')) {
        return 0;
      }
      throw error;
    }
  }
}

module.exports = LeaveBalanceTransaction;

