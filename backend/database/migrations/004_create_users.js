exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('employee_number', 20).notNullable().unique();
    table.string('surname', 50);
    table.string('given_name', 50);
    table.string('alias', 50);
    table.string('name_zh', 100);
    table.string('email', 100).unique();
    table.string('password_hash', 255).notNullable();
    table.integer('department_id').unsigned().notNullable()
      .references('id').inTable('departments').onDelete('RESTRICT');
    table.integer('position_id').unsigned()
      .references('id').inTable('positions').onDelete('SET NULL');
    table.date('hire_date');
    table.date('termination_date');
    table.timestamps(true, true);
    
    table.index('employee_number');
    table.index('email');
    table.index('department_id');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};
