const knex = require('../../config/database');

class User {
  static async findByEmail(email) {
    return await knex('users')
      .leftJoin('departments', 'users.department_id', 'departments.id')
      .leftJoin('positions', 'users.position_id', 'positions.id')
      .select(
        'users.*',
        'departments.name as department_name',
        'departments.name_zh as department_name_zh',
        'positions.name as position_name',
        'positions.name_zh as position_name_zh'
      )
      .where('users.email', email)
      .first();
  }

  static async findById(id) {
    return await knex('users')
      .leftJoin('departments', 'users.department_id', 'departments.id')
      .leftJoin('positions', 'users.position_id', 'positions.id')
      .select(
        'users.*',
        'departments.name as department_name',
        'departments.name_zh as department_name_zh',
        'positions.name as position_name',
        'positions.name_zh as position_name_zh'
      )
      .where('users.id', id)
      .first();
  }

  static async create(userData) {
    const [user] = await knex('users').insert(userData).returning('*');
    return await this.findById(user.id);
  }

  static async update(id, userData) {
    await knex('users').where('id', id).update(userData);
    return await this.findById(id);
  }

  static async updatePassword(id, passwordHash) {
    return await knex('users').where('id', id).update({ password_hash: passwordHash });
  }

  static async findAll(options = {}) {
    let query = knex('users')
      .leftJoin('departments', 'users.department_id', 'departments.id')
      .leftJoin('positions', 'users.position_id', 'positions.id')
      .select(
        'users.*',
        'departments.name as department_name',
        'departments.name_zh as department_name_zh',
        'positions.name as position_name',
        'positions.name_zh as position_name_zh'
      );

    if (options.department_id) {
      query = query.where('users.department_id', options.department_id);
    }

    if (options.search) {
      query = query.where(function() {
        this.where('users.employee_number', 'like', `%${options.search}%`)
          .orWhere('users.surname', 'like', `%${options.search}%`)
          .orWhere('users.given_name', 'like', `%${options.search}%`)
          .orWhere('users.name_zh', 'like', `%${options.search}%`)
          .orWhere('users.email', 'like', `%${options.search}%`);
      });
    }

    return await query.orderBy('users.created_at', 'desc');
  }

  static async findByEmployeeNumber(employeeNumber) {
    return await knex('users')
      .leftJoin('departments', 'users.department_id', 'departments.id')
      .leftJoin('positions', 'users.position_id', 'positions.id')
      .select(
        'users.*',
        'departments.name as department_name',
        'departments.name_zh as department_name_zh',
        'positions.name as position_name',
        'positions.name_zh as position_name_zh'
      )
      .whereRaw('LOWER(users.employee_number) = LOWER(?)', [employeeNumber])
      .first();
  }

  // 取得使用者所屬的部門群組
  static async getDepartmentGroups(userId) {
    const DepartmentGroup = require('./DepartmentGroup');
    return await DepartmentGroup.findByUserId(userId);
  }

  // 取得使用者所屬的授權群組
  static async getDelegationGroups(userId) {
    return await knex('delegation_groups')
      .whereRaw('? = ANY(delegation_groups.user_ids)', [Number(userId)])
      .select('*');
  }

  // 檢查使用者是否為 HR 群組成員
  static async isHRMember(userId) {
    const hrGroup = await knex('delegation_groups')
      .where('name', 'HR Group')
      .first();
    
    if (!hrGroup || !Array.isArray(hrGroup.user_ids)) {
      return false;
    }
    
    const userIds = hrGroup.user_ids.map(id => Number(id));
    return userIds.includes(Number(userId));
  }

  // 檢查使用者是否可以批核某個假期申請
  static async canApprove(userId, leaveApplicationId) {
    const application = await knex('leave_applications')
      .where('id', leaveApplicationId)
      .first();
    
    if (!application) {
      return false;
    }

    // 檢查使用者是否為該申請的批核者
    if (application.checker_id === userId ||
        application.approver_1_id === userId ||
        application.approver_2_id === userId ||
        application.approver_3_id === userId) {
      return true;
    }

    return false;
  }
}

module.exports = User;
