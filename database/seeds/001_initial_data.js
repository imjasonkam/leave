const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  await knex('leave_types').del();
  await knex('groups').del();
  await knex('positions').del();
  await knex('departments').del();
  await knex('users').del();

  // 建立部門
  const [hrDept] = await knex('departments').insert([
    { name: 'HR', name_zh: '人力資源部', description: '人力資源部門' },
    { name: 'IT', name_zh: '資訊科技部', description: '資訊科技部門' },
    { name: 'Finance', name_zh: '財務部', description: '財務部門' }
  ]).returning('*');

  // 建立職位
  const [managerPos, staffPos] = await knex('positions').insert([
    { name: 'Manager', name_zh: '經理', description: '管理層職位' },
    { name: 'Staff', name_zh: '職員', description: '一般職員' }
  ]).returning('*');

  // 建立群組
  const [hrGroup] = await knex('groups').insert([
    { name: 'HR Group', name_zh: 'HR群組', description: '人力資源群組' }
  ]).returning('*');

  // 建立假期類型
  await knex('leave_types').insert([
    { code: 'AL', name: 'Annual Leave', name_zh: '年假', requires_balance: true },
    { code: 'BL', name: 'Birthday Leave', name_zh: '生日假', requires_balance: true },
    { code: 'CL', name: 'Compensatory Leave', name_zh: '補假', requires_balance: true },
    { code: 'PSL', name: 'Paid Sick Leave', name_zh: '全薪病假', requires_balance: true },
    { code: 'ML', name: 'Marriage Leave', name_zh: '婚假', requires_balance: false },
    { code: 'USL', name: 'Unpaid Sick Leave', name_zh: '無薪病假', requires_balance: false },
    { code: 'UPL', name: 'Unpaid Personal Leave', name_zh: '無薪事假', requires_balance: false }
  ]);

  // 建立系統管理員
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const [admin] = await knex('users').insert([
    {
      employee_number: 'ADMIN001',
      surname: 'Admin',
      given_name: 'System',
      name_zh: '系統管理員',
      email: 'admin@example.com',
      password_hash: adminPasswordHash,
      department_id: hrDept.id,
      position_id: managerPos.id,
      group_id: hrGroup.id,
      is_system_admin: true,
      is_dept_head: true,
      is_active: true
    }
  ]).returning('*');

  // 建立測試用戶
  const userPasswordHash = await bcrypt.hash('user123', 10);
  await knex('users').insert([
    {
      employee_number: 'EMP001',
      surname: 'Chan',
      given_name: 'John',
      name_zh: '陳約翰',
      email: 'john.chan@example.com',
      password_hash: userPasswordHash,
      department_id: hrDept.id,
      position_id: staffPos.id,
      is_active: true,
      checker_id: admin.id,
      approver_1_id: admin.id,
      approver_2_id: admin.id,
      approver_3_id: admin.id
    }
  ]);
};

