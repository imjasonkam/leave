import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const AdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    employee_number: '',
    surname: '',
    given_name: '',
    alias: '',
    name_zh: '',
    email: '',
    password: '',
    department_id: '',
    position_id: '',
    group_id: '',
    is_system_admin: false,
    is_dept_head: false,
    is_active: true,
    checker_id: '',
    approver_1_id: '',
    approver_2_id: '',
    approver_3_id: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
    fetchPositions();
    fetchGroups();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/api/departments');
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Fetch departments error:', error);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await axios.get('/api/positions');
      setPositions(response.data.positions || []);
    } catch (error) {
      console.error('Fetch positions error:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get('/api/groups');
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Fetch groups error:', error);
    }
  };

  const handleOpen = () => {
    setEditing(null);
    setFormData({
      employee_number: '',
      surname: '',
      given_name: '',
      alias: '',
      name_zh: '',
      email: '',
      password: '',
      department_id: '',
      position_id: '',
      group_id: '',
      is_system_admin: false,
      is_dept_head: false,
      is_active: true,
      checker_id: '',
      approver_1_id: '',
      approver_2_id: '',
      approver_3_id: ''
    });
    setOpen(true);
  };

  const handleEdit = (userData) => {
    setEditing(userData.id);
    setFormData({
      employee_number: userData.employee_number,
      surname: userData.surname,
      given_name: userData.given_name,
      alias: userData.alias || '',
      name_zh: userData.name_zh,
      email: userData.email,
      password: '',
      department_id: userData.department_id || '',
      position_id: userData.position_id || '',
      group_id: userData.group_id || '',
      is_system_admin: userData.is_system_admin || false,
      is_dept_head: userData.is_dept_head || false,
      is_active: userData.is_active !== undefined ? userData.is_active : true,
      checker_id: userData.checker_id || '',
      approver_1_id: userData.approver_1_id || '',
      approver_2_id: userData.approver_2_id || '',
      approver_3_id: userData.approver_3_id || ''
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const submitData = { ...formData };
      if (!editing && !submitData.password) {
        alert('請輸入密碼');
        return;
      }
      if (!submitData.password) {
        delete submitData.password;
      }

      if (editing) {
        await axios.put(`/api/admin/users/${editing}`, submitData);
      } else {
        await axios.post('/api/admin/users', submitData);
      }

      setOpen(false);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || '操作失敗');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">用戶管理</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
          新增用戶
        </Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>員工編號</TableCell>
                <TableCell>姓名</TableCell>
                <TableCell>電子郵件</TableCell>
                <TableCell>部門</TableCell>
                <TableCell>職位</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.employee_number}</TableCell>
                  <TableCell>{u.name_zh}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.department_name_zh || '-'}</TableCell>
                  <TableCell>{u.position_name_zh || '-'}</TableCell>
                  <TableCell>{u.is_active ? '啟用' : '停用'}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(u)}>
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? '編輯用戶' : '新增用戶'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="員工編號"
              value={formData.employee_number}
              onChange={(e) => setFormData(prev => ({ ...prev, employee_number: e.target.value }))}
              required
              disabled={!!editing}
            />
            <TextField
              label="姓氏"
              value={formData.surname}
              onChange={(e) => setFormData(prev => ({ ...prev, surname: e.target.value }))}
              required
            />
            <TextField
              label="名字"
              value={formData.given_name}
              onChange={(e) => setFormData(prev => ({ ...prev, given_name: e.target.value }))}
              required
            />
            <TextField
              label="別名"
              value={formData.alias}
              onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
            />
            <TextField
              label="中文姓名"
              value={formData.name_zh}
              onChange={(e) => setFormData(prev => ({ ...prev, name_zh: e.target.value }))}
              required
            />
            <TextField
              label="電子郵件"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
            <TextField
              label={editing ? '新密碼（留空則不更改）' : '密碼'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required={!editing}
            />
            <FormControl>
              <InputLabel>部門</InputLabel>
              <Select
                value={formData.department_id}
                label="部門"
                onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
              >
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name_zh}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>職位</InputLabel>
              <Select
                value={formData.position_id}
                label="職位"
                onChange={(e) => setFormData(prev => ({ ...prev, position_id: e.target.value }))}
              >
                {positions.map((pos) => (
                  <MenuItem key={pos.id} value={pos.id}>
                    {pos.name_zh}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>群組</InputLabel>
              <Select
                value={formData.group_id}
                label="群組"
                onChange={(e) => setFormData(prev => ({ ...prev, group_id: e.target.value }))}
              >
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name_zh}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_system_admin}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_system_admin: e.target.checked }))}
                />
              }
              label="系統管理員"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_dept_head}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_dept_head: e.target.checked }))}
                />
              }
              label="部門主管"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                />
              }
              label="啟用"
            />
            <FormControl>
              <InputLabel>檢查人</InputLabel>
              <Select
                value={formData.checker_id}
                label="檢查人"
                onChange={(e) => setFormData(prev => ({ ...prev, checker_id: e.target.value }))}
              >
                <MenuItem value="">無</MenuItem>
                {users.filter(u => u.id !== (editing || null)).map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name_zh} ({u.employee_number})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>第一批核人</InputLabel>
              <Select
                value={formData.approver_1_id}
                label="第一批核人"
                onChange={(e) => setFormData(prev => ({ ...prev, approver_1_id: e.target.value }))}
              >
                <MenuItem value="">無</MenuItem>
                {users.filter(u => u.id !== (editing || null)).map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name_zh} ({u.employee_number})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>第二批核人</InputLabel>
              <Select
                value={formData.approver_2_id}
                label="第二批核人"
                onChange={(e) => setFormData(prev => ({ ...prev, approver_2_id: e.target.value }))}
              >
                <MenuItem value="">無</MenuItem>
                {users.filter(u => u.id !== (editing || null)).map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name_zh} ({u.employee_number})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>第三批核人 (HR)</InputLabel>
              <Select
                value={formData.approver_3_id}
                label="第三批核人 (HR)"
                onChange={(e) => setFormData(prev => ({ ...prev, approver_3_id: e.target.value }))}
              >
                <MenuItem value="">無</MenuItem>
                {users.filter(u => u.id !== (editing || null)).map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name_zh} ({u.employee_number})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} variant="contained">儲存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsers;

