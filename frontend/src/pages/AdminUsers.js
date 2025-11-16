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
  FormControlLabel,
  Switch
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';
import { formatDate } from '../utils/dateFormat';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
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
    hire_date: '',
    deactivated: false
  });

  const trimmedSearch = searchTerm.trim();
  const normalizedSearch = trimmedSearch.toLowerCase();
  const filteredUsers = users.filter((u) => {
    if (!trimmedSearch) {
      return true;
    }

    const englishFullName = `${u.given_name || ''} ${u.surname || ''}`.trim();
    const reversedEnglishFullName = `${u.surname || ''} ${u.given_name || ''}`.trim();

    const candidates = [
      u.id?.toString() || '',
      u.employee_number || '',
      englishFullName,
      reversedEnglishFullName,
      u.surname || '',
      u.given_name || '',
      u.name_zh || '',
      u.alias || ''
    ];

    return candidates.some((candidate) => {
      const value = candidate.toString();
      return (
        value.toLowerCase().includes(normalizedSearch) ||
        value.includes(trimmedSearch)
      );
    });
  });

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
    fetchPositions();
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
      hire_date: '',
      deactivated: false
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
      hire_date: userData.hire_date ? userData.hire_date.split('T')[0] : '',
      deactivated: !!userData.deactivated
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
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mb: 2
        }}
      >
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          用戶管理
        </Typography>
        <TextField
          size="small"
          placeholder="搜尋員工編號 / 英文姓名 / 中文姓名 / 別名"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 260 }}
        />
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
                <TableCell>入職日期</TableCell>
                <TableCell>帳戶狀態</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.employee_number}</TableCell>
                  <TableCell>{u.name_zh}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.department_name_zh || '-'}</TableCell>
                  <TableCell>{u.position_name_zh || '-'}</TableCell>
                  <TableCell>{formatDate(u.hire_date)}</TableCell>
                  <TableCell>
                    {u.deactivated ? '已停用' : '啟用中'}
                  </TableCell>
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
            <TextField
              label="入職日期"
              type="date"
              value={formData.hire_date}
              onChange={(e) => setFormData(prev => ({ ...prev, hire_date: e.target.value }))}
              InputLabelProps={{
                shrink: true
              }}
            />
            <FormControlLabel
              control={(
                <Switch
                  checked={formData.deactivated}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, deactivated: e.target.checked }))
                  }
                  color="error"
                />
              )}
              label={formData.deactivated ? '帳戶已停用（無法登入）' : '帳戶啟用中'}
            />
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
