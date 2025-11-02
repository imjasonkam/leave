import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import axios from 'axios';

const AdminBalances = () => {
  const [users, setUsers] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    leave_type_id: '',
    balance: '',
    year: new Date().getFullYear()
  });

  useEffect(() => {
    fetchUsers();
    fetchLeaveTypes();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchBalances();
    }
  }, [selectedUserId, selectedYear]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const response = await axios.get('/api/admin/leave-types');
      setLeaveTypes(response.data.leaveTypes || []);
    } catch (error) {
      console.error('Fetch leave types error:', error);
    }
  };

  const fetchBalances = async () => {
    try {
      const response = await axios.get('/api/leaves/balances', {
        params: { user_id: selectedUserId, year: selectedYear }
      });
      setBalances(response.data.balances || []);
    } catch (error) {
      console.error('Fetch balances error:', error);
    }
  };

  const handleOpen = () => {
    setFormData({
      user_id: selectedUserId || '',
      leave_type_id: '',
      balance: '',
      year: selectedYear
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      await axios.post('/api/admin/balances', formData);
      setOpen(false);
      fetchBalances();
    } catch (error) {
      alert(error.response?.data?.message || '操作失敗');
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        假期餘額管理
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>用戶</InputLabel>
            <Select
              value={selectedUserId}
              label="用戶"
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name_zh} ({u.employee_number})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>年份</InputLabel>
            <Select
              value={selectedYear}
              label="年份"
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {years.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={handleOpen} disabled={!selectedUserId}>
            設定餘額
          </Button>
        </Box>
      </Paper>

      {selectedUserId && (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>假期類型</TableCell>
                  <TableCell align="right">餘額</TableCell>
                  <TableCell align="right">已使用</TableCell>
                  <TableCell align="right">總額</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {balances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">沒有餘額記錄</TableCell>
                  </TableRow>
                ) : (
                  balances.map((balance) => (
                    <TableRow key={balance.id}>
                      <TableCell>
                        {balance.leave_type_name_zh} ({balance.leave_type_code})
                      </TableCell>
                      <TableCell align="right">
                        <strong>{parseFloat(balance.balance).toFixed(1)}</strong>
                      </TableCell>
                      <TableCell align="right">{parseFloat(balance.taken).toFixed(1)}</TableCell>
                      <TableCell align="right">
                        {(parseFloat(balance.balance) + parseFloat(balance.taken)).toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>設定假期餘額</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
            <FormControl>
              <InputLabel>假期類型</InputLabel>
              <Select
                value={formData.leave_type_id}
                label="假期類型"
                onChange={(e) => setFormData(prev => ({ ...prev, leave_type_id: e.target.value }))}
                required
              >
                {leaveTypes.filter(lt => lt.requires_balance).map((lt) => (
                  <MenuItem key={lt.id} value={lt.id}>
                    {lt.name_zh}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="餘額"
              type="number"
              value={formData.balance}
              onChange={(e) => setFormData(prev => ({ ...prev, balance: e.target.value }))}
              required
              inputProps={{ min: 0, step: 0.5 }}
            />
            <TextField
              label="年份"
              type="number"
              value={formData.year}
              onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
              required
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

export default AdminBalances;

