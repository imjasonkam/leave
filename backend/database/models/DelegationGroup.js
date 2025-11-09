const knex = require('../../config/database');

class DelegationGroup {
  static async findAll() {
    return await knex('delegation_groups')
      .orderBy('name');
  }

  static async findById(id) {
    return await knex('delegation_groups').where('id', id).first();
  }

  static async create(groupData) {
    const [group] = await knex('delegation_groups').insert(groupData).returning('*');
    return group;
  }

  static async update(id, groupData) {
    await knex('delegation_groups').where('id', id).update(groupData);
    return await this.findById(id);
  }

  static async delete(id) {
    return await knex('delegation_groups').where('id', id).del();
  }

  // 新增使用者到授權群組
  static async addUser(groupId, userId) {
    const group = await this.findById(groupId);
    if (!group) {
      throw new Error('授權群組不存在');
    }
    
    const userIds = group.user_ids || [];
    if (!userIds.includes(userId)) {
      userIds.push(userId);
      await knex('delegation_groups')
        .where('id', groupId)
        .update({ user_ids: userIds });
    }
    
    return await this.findById(groupId);
  }

  // 從授權群組移除使用者
  static async removeUser(groupId, userId) {
    const group = await this.findById(groupId);
    if (!group) {
      throw new Error('授權群組不存在');
    }
    
    const userIds = (group.user_ids || []).filter(id => id !== userId);
    await knex('delegation_groups')
      .where('id', groupId)
      .update({ user_ids: userIds });
    
    return await this.findById(groupId);
  }

  // 取得授權群組的所有成員
  static async getMembers(groupId) {
    const group = await this.findById(groupId);
    if (!group || !group.user_ids || group.user_ids.length === 0) {
      return [];
    }
    
    return await knex('users')
      .whereIn('id', group.user_ids)
      .leftJoin('departments', 'users.department_id', 'departments.id')
      .leftJoin('positions', 'users.position_id', 'positions.id')
      .select(
        'users.*',
        'departments.name as department_name',
        'departments.name_zh as department_name_zh',
        'positions.name as position_name',
        'positions.name_zh as position_name_zh'
      );
  }

  // 檢查使用者是否在授權群組中
  static async hasUser(groupId, userId) {
    const group = await this.findById(groupId);
    if (!group) {
      return false;
    }
    
    return (group.user_ids || []).includes(userId);
  }
}

module.exports = DelegationGroup;

