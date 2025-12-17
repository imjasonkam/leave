const User = require('../database/models/User');
const knex = require('../config/database');

class TodoController {
  // ========== HR 待處理清單 ==========
  
  // 獲取所有 HR 待處理清單（僅限 HR Group 成員）
  async getHRTodos(req, res) {
    try {
      // 檢查是否為 HR 成員
      const isHRMember = await User.isHRMember(req.user.id);
      if (!isHRMember) {
        return res.status(403).json({ message: '只有HR Group成員可以查看HR待處理清單' });
      }

      const todos = await knex('hr_todos')
        .select(
          'hr_todos.id',
          'hr_todos.created_date',
          'hr_todos.employee_number',
          'hr_todos.employee_name',
          'hr_todos.start_date',
          'hr_todos.end_date',
          'hr_todos.details',
          'hr_todos.progress',
          'hr_todos.created_by_id',
          'hr_todos.created_at',
          'hr_todos.updated_at',
          'creator.employee_number as creator_employee_number',
          'creator.display_name as creator_name',
          'creator.name_zh as creator_name_zh'
        )
        .leftJoin('users as creator', 'hr_todos.created_by_id', 'creator.id')
        .orderBy('hr_todos.created_at', 'desc');

      res.json({ todos });
    } catch (error) {
      console.error('Get todos error:', error);
      res.status(500).json({ message: '獲取HR待處理清單時發生錯誤' });
    }
  }

  // 創建 HR 待處理項目（僅限 HR Group 成員）
  async createHRTodo(req, res) {
    try {
      // 檢查是否為 HR 成員
      const isHRMember = await User.isHRMember(req.user.id);
      if (!isHRMember) {
        return res.status(403).json({ message: '只有HR Group成員可以創建HR待處理項目' });
      }

      const {
        created_date,
        employee_number,
        employee_name,
        start_date,
        end_date,
        details,
        progress
      } = req.body;

      // 驗證必填欄位
      if (!created_date) {
        return res.status(400).json({ message: '請填寫建立日期' });
      }

      // 驗證進度值
      const validProgress = ['pending', 'in_progress', 'completed', 'cancelled'];
      const todoProgress = progress || 'pending';
      if (!validProgress.includes(todoProgress)) {
        return res.status(400).json({ message: `無效的進度值。允許的值：${validProgress.join(', ')}` });
      }

      const todoData = {
        created_date,
        employee_number: employee_number || null,
        employee_name: employee_name || null,
        start_date: start_date || null,
        end_date: end_date || null,
        details: details || null,
        progress: todoProgress,
        created_by_id: req.user.id
      };

      const [todo] = await knex('hr_todos')
        .insert(todoData)
        .returning('*');

      // 獲取建立者信息
      const creator = await User.findById(req.user.id);
      const todoWithCreator = {
        ...todo,
        creator_employee_number: creator?.employee_number,
        creator_name: creator?.display_name,
        creator_name_zh: creator?.name_zh
      };

      res.status(201).json({
        message: 'HR待處理項目建立成功',
        todo: todoWithCreator
      });
    } catch (error) {
      console.error('Create HR todo error:', error);
      res.status(500).json({ message: '建立HR待處理項目時發生錯誤' });
    }
  }

  // 更新 HR 待處理項目（僅限 HR Group 成員）
  async updateHRTodo(req, res) {
    try {
      // 檢查是否為 HR 成員
      const isHRMember = await User.isHRMember(req.user.id);
      if (!isHRMember) {
        return res.status(403).json({ message: '只有HR Group成員可以更新HR待處理項目' });
      }

      const { id } = req.params;
      const {
        created_date,
        employee_number,
        employee_name,
        start_date,
        end_date,
        details,
        progress
      } = req.body;

      // 檢查待辦事項是否存在
      const existingTodo = await knex('hr_todos').where('id', id).first();
      if (!existingTodo) {
        return res.status(404).json({ message: '待辦事項不存在' });
      }

      const updateData = {};

      if (created_date !== undefined) {
        updateData.created_date = created_date;
      }
      if (employee_number !== undefined) {
        updateData.employee_number = employee_number || null;
      }
      if (employee_name !== undefined) {
        updateData.employee_name = employee_name || null;
      }
      if (start_date !== undefined) {
        updateData.start_date = start_date || null;
      }
      if (end_date !== undefined) {
        updateData.end_date = end_date || null;
      }
      if (details !== undefined) {
        updateData.details = details || null;
      }
      if (progress !== undefined) {
        // 驗證進度值
        const validProgress = ['pending', 'in_progress', 'completed', 'cancelled'];
        if (!validProgress.includes(progress)) {
          return res.status(400).json({ message: `無效的進度值。允許的值：${validProgress.join(', ')}` });
        }
        updateData.progress = progress;
      }

      const [updatedTodo] = await knex('hr_todos')
        .where('id', id)
        .update(updateData)
        .returning('*');

      // 獲取建立者信息
      const creator = await User.findById(updatedTodo.created_by_id);
      const todoWithCreator = {
        ...updatedTodo,
        creator_employee_number: creator?.employee_number,
        creator_name: creator?.display_name,
        creator_name_zh: creator?.name_zh
      };

      res.json({
        message: 'HR待處理項目更新成功',
        todo: todoWithCreator
      });
    } catch (error) {
      console.error('Update HR todo error:', error);
      res.status(500).json({ message: '更新HR待處理項目時發生錯誤' });
    }
  }

  // 刪除 HR 待處理項目（僅限 HR Group 成員）
  async deleteHRTodo(req, res) {
    try {
      // 檢查是否為 HR 成員
      const isHRMember = await User.isHRMember(req.user.id);
      if (!isHRMember) {
        return res.status(403).json({ message: '只有HR Group成員可以刪除HR待處理項目' });
      }

      const { id } = req.params;

      // 檢查待處理項目是否存在
      const existingTodo = await knex('hr_todos').where('id', id).first();
      if (!existingTodo) {
        return res.status(404).json({ message: 'HR待處理項目不存在' });
      }

      await knex('hr_todos').where('id', id).del();

      res.json({ message: 'HR待處理項目刪除成功' });
    } catch (error) {
      console.error('Delete HR todo error:', error);
      res.status(500).json({ message: '刪除HR待處理項目時發生錯誤' });
    }
  }

  // ========== 個人待辦事項 ==========
  
  // 獲取當前用戶的個人待辦事項
  async getMyTodos(req, res) {
    try {
      const todos = await knex('user_todos')
        .where('user_id', req.user.id)
        .orderBy('created_at', 'desc');

      res.json({ todos });
    } catch (error) {
      console.error('Get my todos error:', error);
      res.status(500).json({ message: '獲取個人待辦事項時發生錯誤' });
    }
  }

  // 創建個人待辦事項
  async createMyTodo(req, res) {
    try {
      const {
        title,
        description,
        status,
        due_date,
        priority
      } = req.body;

      // 驗證必填欄位
      if (!title || title.trim() === '') {
        return res.status(400).json({ message: '請填寫標題' });
      }

      // 驗證狀態值
      const validStatus = ['pending', 'in_progress', 'completed'];
      const todoStatus = status || 'pending';
      if (!validStatus.includes(todoStatus)) {
        return res.status(400).json({ message: `無效的狀態值。允許的值：${validStatus.join(', ')}` });
      }

      // 驗證優先級
      const validPriority = [1, 2, 3];
      const todoPriority = priority || 1;
      if (!validPriority.includes(Number(todoPriority))) {
        return res.status(400).json({ message: `無效的優先級。允許的值：1(低), 2(中), 3(高)` });
      }

      const todoData = {
        user_id: req.user.id,
        title: title.trim(),
        description: description ? description.trim() : null,
        status: todoStatus,
        due_date: due_date || null,
        priority: Number(todoPriority)
      };

      const [todo] = await knex('user_todos')
        .insert(todoData)
        .returning('*');

      res.status(201).json({
        message: '個人待辦事項建立成功',
        todo
      });
    } catch (error) {
      console.error('Create my todo error:', error);
      res.status(500).json({ message: '建立個人待辦事項時發生錯誤' });
    }
  }

  // 更新個人待辦事項
  async updateMyTodo(req, res) {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        status,
        due_date,
        priority
      } = req.body;

      // 檢查待辦事項是否存在且屬於當前用戶
      const existingTodo = await knex('user_todos')
        .where('id', id)
        .where('user_id', req.user.id)
        .first();
      
      if (!existingTodo) {
        return res.status(404).json({ message: '個人待辦事項不存在或無權限' });
      }

      const updateData = {};

      if (title !== undefined) {
        if (!title || title.trim() === '') {
          return res.status(400).json({ message: '標題不能為空' });
        }
        updateData.title = title.trim();
      }
      if (description !== undefined) {
        updateData.description = description ? description.trim() : null;
      }
      if (status !== undefined) {
        const validStatus = ['pending', 'in_progress', 'completed'];
        if (!validStatus.includes(status)) {
          return res.status(400).json({ message: `無效的狀態值。允許的值：${validStatus.join(', ')}` });
        }
        updateData.status = status;
      }
      if (due_date !== undefined) {
        updateData.due_date = due_date || null;
      }
      if (priority !== undefined) {
        const validPriority = [1, 2, 3];
        if (!validPriority.includes(Number(priority))) {
          return res.status(400).json({ message: `無效的優先級。允許的值：1(低), 2(中), 3(高)` });
        }
        updateData.priority = Number(priority);
      }

      const [updatedTodo] = await knex('user_todos')
        .where('id', id)
        .where('user_id', req.user.id)
        .update(updateData)
        .returning('*');

      res.json({
        message: '個人待辦事項更新成功',
        todo: updatedTodo
      });
    } catch (error) {
      console.error('Update my todo error:', error);
      res.status(500).json({ message: '更新個人待辦事項時發生錯誤' });
    }
  }

  // 刪除個人待辦事項
  async deleteMyTodo(req, res) {
    try {
      const { id } = req.params;

      // 檢查待辦事項是否存在且屬於當前用戶
      const existingTodo = await knex('user_todos')
        .where('id', id)
        .where('user_id', req.user.id)
        .first();
      
      if (!existingTodo) {
        return res.status(404).json({ message: '個人待辦事項不存在或無權限' });
      }

      await knex('user_todos')
        .where('id', id)
        .where('user_id', req.user.id)
        .del();

      res.json({ message: '個人待辦事項刪除成功' });
    } catch (error) {
      console.error('Delete my todo error:', error);
      res.status(500).json({ message: '刪除個人待辦事項時發生錯誤' });
    }
  }
}

module.exports = new TodoController();

