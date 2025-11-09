const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // 清空所有表（注意順序，避免外鍵約束問題）
  await knex('leave_applications').del();
  await knex('leave_balances').del();
  await knex('users').del();
  await knex('department_groups').del();
  await knex('delegation_groups').del();
  await knex('leave_types').del();
  await knex('positions').del();
  await knex('departments').del();

  // 建立部門
  await knex('departments').insert([
    { name: 'Accounting', name_zh: '會計部', description: ''},
    { name: 'B2B', name_zh: '企客業務部', description: ''},
    { name: 'Business Development', name_zh: '業務拓展部', description: ''},
    { name: 'Category', name_zh: '品類部', description: ''},
    { name: 'General Administration', name_zh: '行政部', description: ''},
    { name: 'Human Resources', name_zh: '人力資源部', description: ''},
    { name: 'IT', name_zh: '資訊科技部', description: ''},
    { name: 'Managing Director', name_zh: '董事總經理', description: ''},
    { name: 'Marketing', name_zh: '市場推廣部', description: ''},
    { name: 'Merchandising', name_zh: '採購部', description: ''},
    { name: 'Project', name_zh: '專案部', description: ''},
    { name: 'Property', name_zh: '物業部', description: ''},
    { name: 'Retail', name_zh: '零售部', description: ''},
    { name: 'Supply Chain & Logistics', name_zh: '供應鏈及物流部', description: ''}
  ]);

  // 建立職位
  await knex('positions').insert([
    // { name: 'Manager', name_zh: '經理', description: '管理層職位' },
    // { name: 'Staff', name_zh: '職員', description: '一般職員' },
    // { name: 'Head', name_zh: '主管', description: '部門主管' },
    { name: 'System', name_zh: '系統', description: '系統' },
    { name: 'Managing Director', name_zh: 'Managing Director', description: 'Managing Director' },
    { name: 'Financial Controller', name_zh: 'Financial Controller', description: ' Financial Controller' },
    { name: 'Assistant Accounting Manager ', name_zh: 'Assistant Accounting Manager  ', description: 'Assistant Accounting Manager ' },
    { name: 'Assistant Category Manager', name_zh: 'Assistant Category Manager ', description: 'Assistant Category Manager' },
    { name: 'Project Executive', name_zh: 'Project Executive', description: 'Project Executive' },
    { name: 'Senior Accounting Manager', name_zh: 'Senior Accounting Manager', description: 'Senior Accounting Manager' },
    { name: 'Category Manager', name_zh: 'Category Manager', description: 'Category Manager' },
    { name: 'Accounting Officer', name_zh: 'Accounting Officer', description: 'Accounting Officer' },
    { name: 'Part-Time Accounting Clerk', name_zh: 'Part-Time Accounting Clerk', description: 'Part-Time Accounting Clerk' },
    { name: 'Accountant', name_zh: 'Accountant', description: 'Accountant' },
    { name: 'Senior Category Manager', name_zh: 'Senior Category Manager', description: 'Senior Category Manager' },
    { name: 'Project Supervisor', name_zh: 'Project Supervisor', description: 'Project Supervisor' },
    { name: 'Senior Merchandiser', name_zh: 'Senior Merchandiser', description: 'Senior Merchandiser' },
    { name: 'Business Analyst', name_zh: 'Business Analyst', description: 'Business Analyst' },
    { name: 'Technician', name_zh: 'Technician', description: 'Technician' },
    { name: 'Product Development Manager', name_zh: 'Product Development Manager', description: 'Product Development Manager' },
    { name: 'Senior Accounts Clerk', name_zh: 'Senior Accounts Clerk', description: 'Senior Accounts Clerk' },
    { name: 'Commercial Manager', name_zh: 'Commercial Manager', description: 'Commercial Manager' },
    { name: 'Assistant Merchandising Admin Manager', name_zh: 'Assistant Merchandising Admin Manager', description: 'Assistant Merchandising Admin Manager' },
    { name: 'Senior Merchandising Manager', name_zh: 'Senior Merchandising Manager', description: 'Senior Merchandising Manager' },
    { name: 'Senior Buyer', name_zh: 'Senior Buyer', description: 'Senior Buyer' },
    { name: 'Head of Merchandising', name_zh: 'Head of Merchandising', description: 'Head of Merchandising' },
    { name: 'Office Assistant', name_zh: 'Office Assistant', description: 'Office Assistant' },
    { name: 'General Administration Manager', name_zh: 'General Administration Manager', description: 'General Administration Manager' },
    { name: 'Administration Officer', name_zh: 'Administration Officer', description: 'Administration Officer' },
    { name: 'Assistant Business Development Manager', name_zh: 'Assistant Business Development Manager', description: 'Assistant Business Development Manager' },
    { name: 'Human Resources Manager', name_zh: 'Human Resources Manager', description: 'Human Resources Manager' },
    { name: 'Assistant Merchandiser', name_zh: 'Assistant Merchandiser', description: 'Assistant Merchandiser' },
    { name: 'Senior HR Officer', name_zh: 'Senior HR Officer', description: 'Senior HR Officer' },
    { name: 'Assistant Manager (E-Business & IT)', name_zh: 'Assistant Manager (E-Business & IT)', description: 'Assistant Manager (E-Business & IT)' },
    { name: 'Promoter', name_zh: 'Promoter', description: 'Promoter' },
    { name: 'Store Manager', name_zh: 'Store Manager', description: 'Store Manager' },
    { name: 'Senior Customer Service Associate', name_zh: 'Senior Customer Service Associate', description: 'Senior Customer Service Associate' },
    { name: 'Assistant Area Manager', name_zh: 'Assistant Area Manager', description: 'Assistant Area Manager' },
    { name: 'Store Supervisor', name_zh: 'Store Supervisor', description: 'Store Supervisor' },
    { name: 'Senior Store Manager', name_zh: 'Senior Store Manager', description: 'Senior Store Manager' },
    { name: 'Customer Service Associate', name_zh: 'Customer Service Associate', description: 'Customer Service Associate' },
    { name: 'COO - International Business North Asia & Managing Director of BigC (HK)', name_zh: 'COO - International Business North Asia & Managing Director of BigC (HK) ', description: ' COO - International Business North Asia & Managing Director of BigC (HK)' },
    { name: 'Store Keeper', name_zh: 'Store Keeper', description: 'Store Keeper' },
    { name: 'Part Time Promoter', name_zh: 'Part Time Promoter', description: 'Part Time Promoter' },
    { name: 'Part Time Store Supervisor', name_zh: 'Part Time Store Supervisor', description: 'Part Time Store Supervisor' },
    { name: 'Part Time Customer Service Associate', name_zh: 'Part Time Customer Service Associate', description: 'Part Time Customer Service Associate' },
    { name: 'Part Time Store Keeper', name_zh: 'Part Time Store Keeper', description: 'Part Time Store Keeper' },
    { name: 'Creative Manager', name_zh: 'Creative Manager', description: 'Creative Manager' },
    { name: 'Retail Operation Executive', name_zh: 'Retail Operation Executive', description: 'Retail Operation Executive' },
    { name: 'Merchandising Assistant', name_zh: 'Merchandising Assistant ', description: 'Merchandising Assistant' },
    { name: 'Project Manager ', name_zh: 'Project Manager', description: 'Project Manager' },
    { name: 'Accounts Clerk', name_zh: 'Accounts Clerk', description: 'Accounts Clerk' },
    { name: 'IT Manager', name_zh: 'IT Manager', description: 'IT Manager' },
    { name: 'Sales Admin Assistant', name_zh: 'Sales Admin Assistant', description: 'Sales Admin Assistant' },
    { name: 'Training Manager', name_zh: 'Training Manager', description: 'Training Manager' },
    { name: 'Senior Retail Operation Executive', name_zh: 'Senior Retail Operation Executive', description: 'Senior Retail Operation Executive' },
    { name: 'Senior IT Officer', name_zh: 'Senior IT Officer', description: 'Senior IT Officer' },
    { name: 'Assistant Head of Operation', name_zh: 'Assistant Head of Operation', description: 'Assistant Head of Operation' },
    { name: 'Retail Operation Manager', name_zh: 'Retail Operation Manager', description: 'Retail Operation Manager' },
    { name: 'Assistant Vice President of Retail Operation', name_zh: 'Assistant Vice President of Retail Operation', description: 'Assistant Vice President of Retail Operation' },
    { name: 'Inventory Planning Manager', name_zh: 'Inventory Planning Manager', description: 'Inventory Planning Manager' },
    { name: 'Assistant Inventory Control Manager', name_zh: 'Assistant Inventory Control Manager', description: 'Assistant Inventory Control Manager' },
    { name: 'IT Officer', name_zh: 'IT Officer', description: ' IT Officer' },
    { name: 'Inventory Planning Manager ', name_zh: 'Inventory Planning Manager  ', description: 'Inventory Planning Manager ' },
    { name: 'Assistant Inventory Management Manager', name_zh: 'Assistant Inventory Management Manager', description: 'Assistant Inventory Management Manager ' },
    { name: 'Assistant Inventory Management Manager', name_zh: 'Assistant Inventory Management Manager', description: 'Assistant Inventory Management Manager' },
    { name: 'IT Support Officer', name_zh: 'IT Support Officer', description: 'IT Support Officer' },
    { name: 'Assistant Property Manager', name_zh: 'Assistant Property Manager', description:  'Assistant Property Manager' },
    { name: 'E-Commerce & Business Development Manager', name_zh: 'E-Commerce & Business Development Manager', description: 'E-Commerce & Business Development Manager' },
    { name: 'Assistant Finance Manager', name_zh: 'Assistant Finance Manager', description: 'Assistant Finance Manager' },
    { name: 'Driver', name_zh: 'Driver', description: 'Driver' },
    { name: 'Assistant Project Manager', name_zh: 'Assistant Project Manager', description: 'Assistant Project Manager' },
    { name: 'Part Time Retail Operation Assistant', name_zh: 'Part Time Retail Operation Assistant', description: 'Part Time Retail Operation Assistant' },
    { name: 'Senior Supply Chain Manager', name_zh: 'Senior Supply Chain Manager', description: 'Senior Supply Chain Manager' },
    { name: 'Intern Part Time Customer Service Associate', name_zh: 'Intern Part Time Customer Service Associate', description: 'Intern Part Time Customer Service Associate' },
    { name: 'Intern Customer Service Associate', name_zh: 'Intern Customer Service Associate', description: 'Intern Customer Service Associate' },
    { name: 'Sales Manager', name_zh: 'Sales Manager', description: 'Sales Manager' },
    { name: 'Marketing Specialist', name_zh: 'Marketing Specialist', description: 'Marketing Specialist' },
    { name: 'Assistant Accountant', name_zh: 'Assistant Accountant', description: 'Assistant Accountant' },
    { name: 'Sales Executive', name_zh: 'Sales Executive', description: 'Sales Executive' },
    { name: 'Area Supervisor', name_zh: 'Area Supervisor', description: 'Area Supervisor' },
    { name: 'Office Intern', name_zh: 'Office Intern', description: 'Office Intern' }
  ]);

  // 建立授權群組 (Delegation Groups)
  const delegationGroups = await knex('delegation_groups').insert([
    { name: 'HR Group', name_zh: 'HR群組', description: '人力資源授權群組', user_ids: [] },
    { name: 'Accounting', name_zh: '會計授權群組', description: '會計部授權群組', user_ids: [] },
    { name: 'B2B', name_zh: '企客業務授權群組', description: '企客業務部授權群組', user_ids: [] },
    { name: 'Business Development', name_zh: '業務拓展授權群組', description: '業務拓展部授權群組', user_ids: [] },
    { name: 'Category', name_zh: '品類授權群組', description: '品類部授權群組', user_ids: [] },
    { name: 'General Administration', name_zh: '行政授權群組', description: '行政部授權群組', user_ids: [] },
    { name: 'Human Resources', name_zh: '人力資源授權群組', description: '人力資源部授權群組', user_ids: [] },
    { name: 'IT', name_zh: '資訊科技授權群組', description: '資訊科技部授權群組', user_ids: [] },
    { name: 'Marketing', name_zh: '市場推廣授權群組', description: '市場推廣部授權群組', user_ids: [] },
    { name: 'Merchandising', name_zh: '採購授權群組', description: '採購部授權群組', user_ids: [] },
    { name: 'Project', name_zh: '專案授權群組', description: '專案部授權群組', user_ids: [] },
    { name: 'Retail Heads', name_zh: '零售主管授權群組', description: '零售部主管授權群組', user_ids: [] },
    { name: 'Retail Checker', name_zh: '零售檢查授權群組', description: '零售部檢查授權群組', user_ids: [] },
    { name: 'Supply Chain and Logistics', name_zh: '供應鏈及物流授權群組', description: '供應鏈及物流部授權群組', user_ids: [] }
  ]).returning('*');

  // 取得各授權群組的 ID
  const hrGroupId = delegationGroups.find(g => g.name === 'HR Group').id;
  const accountingDelegId = delegationGroups.find(g => g.name === 'Accounting').id;
  const b2bDelegId = delegationGroups.find(g => g.name === 'B2B').id;
  const bdDelegId = delegationGroups.find(g => g.name === 'Business Development').id;
  const categoryDelegId = delegationGroups.find(g => g.name === 'Category').id;
  const gaDelegId = delegationGroups.find(g => g.name === 'General Administration').id;
  const hrDelegId = delegationGroups.find(g => g.name === 'Human Resources').id;
  const itDelegId = delegationGroups.find(g => g.name === 'IT').id;
  const marketingDelegId = delegationGroups.find(g => g.name === 'Marketing').id;
  const merchandisingDelegId = delegationGroups.find(g => g.name === 'Merchandising').id;
  const projectDelegId = delegationGroups.find(g => g.name === 'Project').id;
  const retailHeadsDelegId = delegationGroups.find(g => g.name === 'Retail Heads').id;
  const retailCheckerDelegId = delegationGroups.find(g => g.name === 'Retail Checker').id;
  const scDelegId = delegationGroups.find(g => g.name === 'Supply Chain and Logistics').id;

  // 建立部門群組 (Department Groups)
  // 格式：checker為null、approver_1為對應的delegation group、approver_2為null、approver_3為HR群組
  await knex('department_groups').insert([
    {
      name: 'Accounting',
      name_zh: '會計部群組',
      description: '會計部門群組',
      user_ids: [],
      checker_id: null,
      approver_1_id: accountingDelegId,
      approver_2_id: null,
      approver_3_id: hrGroupId
    },
    {
      name: 'B2B',
      name_zh: '企客業務部群組',
      description: '企客業務部門群組',
      user_ids: [],
      checker_id: null,
      approver_1_id: b2bDelegId,
      approver_2_id: null,
      approver_3_id: hrGroupId
    },
    {
      name: 'Business Development',
      name_zh: '業務拓展部群組',
      description: '業務拓展部門群組',
      user_ids: [],
      checker_id: null,
      approver_1_id: bdDelegId,
      approver_2_id: null,
      approver_3_id: hrGroupId
    },
    {
      name: 'Category',
      name_zh: '品類部群組',
      description: '品類部門群組',
      user_ids: [],
      checker_id: null,
      approver_1_id: categoryDelegId,
      approver_2_id: null,
      approver_3_id: hrGroupId
    },
    {
      name: 'General Administration',
      name_zh: '行政部群組',
      description: '行政部門群組',
      user_ids: [],
      checker_id: null,
      approver_1_id: gaDelegId,
      approver_2_id: null,
      approver_3_id: hrGroupId
    },
    {
      name: 'Human Resources',
      name_zh: '人力資源部群組',
      description: '人力資源部門群組',
      user_ids: [],
      checker_id: null,
      approver_1_id: hrDelegId,
      approver_2_id: null,
      approver_3_id: hrGroupId
    },
    {
      name: 'IT',
      name_zh: '資訊科技部群組',
      description: '資訊科技部門群組',
      user_ids: [],
      checker_id: null,
      approver_1_id: itDelegId,
      approver_2_id: null,
      approver_3_id: hrGroupId
    },
    {
      name: 'Marketing',
      name_zh: '市場推廣部群組',
      description: '市場推廣部門群組',
      user_ids: [],
      checker_id: null,
      approver_1_id: marketingDelegId,
      approver_2_id: null,
      approver_3_id: hrGroupId
    },
    {
      name: 'Merchandising',
      name_zh: '採購部群組',
      description: '採購部門群組',
      user_ids: [],
      checker_id: null,
      approver_1_id: merchandisingDelegId,
      approver_2_id: null,
      approver_3_id: hrGroupId
    },
    {
      name: 'Project',
      name_zh: '專案部群組',
      description: '專案部門群組',
      user_ids: [],
      checker_id: null,
      approver_1_id: projectDelegId,
      approver_2_id: null,
      approver_3_id: hrGroupId
    },
    {
      name: 'Retail Operation',
      name_zh: '零售運營群組',
      description: '零售運營部門群組',
      user_ids: [],
      checker_id: retailCheckerDelegId,
      approver_1_id: retailHeadsDelegId,
      approver_2_id: null,
      approver_3_id: hrGroupId
    },
    {
      name: 'Supply Chain and Logistics',
      name_zh: '供應鏈及物流部群組',
      description: '供應鏈及物流部門群組',
      user_ids: [],
      checker_id: null,
      approver_1_id: scDelegId,
      approver_2_id: null,
      approver_3_id: hrGroupId
    },
    {
      name: 'Property',
      name_zh: '物業部群組',
      description: '供物業部門群組',
      user_ids: [],
      checker_id: null,
      approver_1_id: scDelegId,
      approver_2_id: null,
      approver_3_id: hrGroupId
    },
    {
      name: 'Mangagement',
      name_zh: '管理層群組',
      description: '管理層部門群組',
      user_ids: [],
      checker_id: null,
      approver_1_id: scDelegId,
      approver_2_id: null,
      approver_3_id: hrGroupId
    }
  ]);

  // 建立假期類型
  await knex('leave_types').insert([
    { code: 'AL', name: 'Annual Leave', name_zh: '年假', requires_balance: true },
    { code: 'BL', name: 'Birthday Leave', name_zh: '生日假', requires_balance: true },
    { code: 'CL', name: 'Compensatory Leave', name_zh: '補假', requires_balance: true },
    { code: 'PSL', name: 'Paid Sick Leave', name_zh: '全薪病假', requires_balance: true },
    { code: 'MGL', name: 'Marriage Leave', name_zh: '婚假', requires_balance: false },
    { code: 'MTL', name: 'Maternity Leave', name_zh: '產假', requires_balance: false },
    { code: 'PTL', name: 'Paternity Leave', name_zh: '侍產假', requires_balance: false },
    { code: 'JSL', name: 'Jury Leave', name_zh: '陪審團假', requires_balance: false },
    { code: 'CPL', name: 'Compassionate Leave', name_zh: '恩恤假', requires_balance: false },
    { code: 'NPSL', name: 'No Pay Sick Leave', name_zh: '無薪病假', requires_balance: false },
    { code: 'NPL', name: 'No Pay Personal Leave', name_zh: '無薪事假', requires_balance: false },
    { code: 'IL', name: 'Work Injury Leave', name_zh: '工傷病假', requires_balance: false }
  ]);

  // 取得部門和職位 ID
  const departments = await knex('departments').select('*');
  const positions = await knex('positions').select('*');
  const hrDept = departments.find(d => d.name === 'Human Resources');
  const managerPos = positions.find(p => p.name === 'System');
  const staffPos = positions.find(p => p.name === 'Staff');

  // 建立系統管理員（HR 群組成員）
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const [admin] = await knex('users').insert([
    {
      employee_number: 'admin',
      surname: 'Admin',
      given_name: 'System',
      alias: 'Admin',
      name_zh: '系統管理員',
      email: 'admin@example.com',
      password_hash: adminPasswordHash,
      department_id: hrDept.id,
      position_id: managerPos.id,
      hire_date: '2020-01-01'
    }
  ]).returning('*');

  // 建立測試用戶
  // const userPasswordHash = await bcrypt.hash('user123', 10);
  // const [john] = await knex('users').insert([
  //   {
  //     employee_number: '4240001',
  //     surname: 'Chan',
  //     given_name: 'John',
  //     name_zh: '陳約翰',
  //     alias: 'John',
  //     email: 'john.chan@example.com',
  //     password_hash: userPasswordHash,
  //     department_id: hrDept.id,
  //     position_id: staffPos.id,
  //     hire_date: '2023-01-01'
  //   }
  // ]).returning('*');

  // const [jason] = await knex('users').insert([
  //   {
  //     employee_number: '4240004',
  //     surname: 'Kam',
  //     given_name: 'Chun Kin Jason',
  //     name_zh: '甘晉鍵',
  //     alias: 'Jason',
  //     email: 'jason.kam@bigchk.com',
  //     password_hash: userPasswordHash,
  //     department_id: hrDept.id,
  //     position_id: staffPos.id,
  //     hire_date: '2023-01-01'
  //   }
  // ]).returning('*');

  // 更新 HR 授權群組，將管理員加入
  await knex('delegation_groups')
    .where('name', 'HR Group')
    .update({
      user_ids: knex.raw('ARRAY[?]::integer[]', [admin.id])
    });

  // 更新 Human Resources 授權群組，將管理員加入
  await knex('delegation_groups')
    .where('name', 'Human Resources')
    .update({
      user_ids: knex.raw('ARRAY[?]::integer[]', [admin.id])
    });

  // 更新 Human Resources 部門群組，將所有 HR 員工加入
  // const hrDeptGroup = await knex('department_groups').where('name', 'Human Resources').first();
  // if (hrDeptGroup) {
  //   await knex('department_groups')
  //     .where('id', hrDeptGroup.id)
  //     .update({
  //       user_ids: knex.raw('ARRAY[?, ?, ?]::integer[]', [admin.id, john.id, jason.id])
  //     });
  // }

  // 取得假期類型
  const leaveTypes = await knex('leave_types').select('*');
  const annualLeave = leaveTypes.find(lt => lt.code === 'AL');
  const sickLeave = leaveTypes.find(lt => lt.code === 'PSL');

  // 為測試用戶建立假期餘額（使用 transaction 方式）
  // 注意：實際的餘額應該通過 leave_balances 表和 transactions 來管理
  // await knex('leave_balances').insert([
  //   {
  //     user_id: john.id,
  //     leave_type_id: annualLeave.id,
  //     year: 2025,
  //     balance: 14.0,
  //     taken: 0.0
  //   },
  //   {
  //     user_id: john.id,
  //     leave_type_id: sickLeave.id,
  //     year: 2025,
  //     balance: 12.0,
  //     taken: 0.0
  //   },
  //   {
  //     user_id: jason.id,
  //     leave_type_id: annualLeave.id,
  //     year: 2025,
  //     balance: 14.0,
  //     taken: 0.0
  //   },
  //   {
  //     user_id: jason.id,
  //     leave_type_id: sickLeave.id,
  //     year: 2025,
  //     balance: 12.0,
  //     taken: 0.0
  //   }
  // ]);
};
