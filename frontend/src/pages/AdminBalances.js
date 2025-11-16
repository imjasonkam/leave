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
  DialogActions,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import axios from 'axios';

const AdminBalances = () => {
  const [users, setUsers] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [open, setOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    user_id: '',
    leave_type_id: '',
    amount: '',
    year: new Date().getFullYear(),
    start_date: null,
    end_date: null,
    remarks: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchLeaveTypes();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchBalances();
      fetchTransactions();
    }
  }, [selectedUserId, selectedYear, selectedLeaveTypeId]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      const usersList = response.data.users || [];
      usersList.sort((a, b) => {
        const aNum = a.employee_number || '';
        const bNum = b.employee_number || '';
        return aNum.localeCompare(bNum, undefined, { numeric: true, sensitivity: 'base' });
      });
      setUsers(usersList);
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

  const fetchTransactions = async () => {
    try {
      const params = { user_id: selectedUserId, year: selectedYear };
      if (selectedLeaveTypeId) {
        params.leave_type_id = selectedLeaveTypeId;
      }
      const response = await axios.get('/api/admin/balance-transactions', { params });
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Fetch transactions error:', error);
    }
  };

  const handleOpen = () => {
    setFormData({
      user_id: selectedUserId || '',
      leave_type_id: selectedLeaveTypeId || '',
      amount: '',
      year: selectedYear,
      start_date: null,
      end_date: null,
      remarks: ''
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const submitData = {
        ...formData,
        start_date: formData.start_date ? dayjs(formData.start_date).format('YYYY-MM-DD') : null,
        end_date: formData.end_date ? dayjs(formData.end_date).format('YYYY-MM-DD') : null
      };
      await axios.post('/api/admin/balance-transactions', submitData);
      setOpen(false);
      fetchBalances();
      fetchTransactions();
    } catch (error) {
      alert(error.response?.data?.message || '操作失敗');
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // 計算每個假期類型的總計
  const totalsByType = transactions.reduce((acc, transaction) => {
    const key = transaction.leave_type_id || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        leave_type_name_zh: transaction.leave_type_name_zh || '未知',
        leave_type_code: transaction.leave_type_code || '',
        total: 0
      };
    }
    acc[key].total += parseFloat(transaction.amount || 0);
    return acc;
  }, {});

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
                  {u.employee_number} ({u.name_zh})
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
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>假期類型（可選）</InputLabel>
            <Select
              value={selectedLeaveTypeId}
              label="假期類型（可選）"
              onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
            >
              <MenuItem value="">全部</MenuItem>
              {leaveTypes.filter(lt => lt.requires_balance).map((lt) => (
                <MenuItem key={lt.id} value={lt.id}>
                  {lt.name_zh} ({lt.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={handleOpen} disabled={!selectedUserId}>
            添加餘額
          </Button>
        </Box>
      </Paper>

      {selectedUserId && (
        <>
          <Paper sx={{ mb: 2 }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="餘額總覽" />
              <Tab label="交易記錄" />
            </Tabs>
          </Paper>

          {tabValue === 0 && (
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>假期類型</TableCell>
                      <TableCell align="right">總額</TableCell>
                      <TableCell align="right">已使用</TableCell>
                      <TableCell align="right">餘額</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {balances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">沒有餘額記錄</TableCell>
                      </TableRow>
                    ) : (
                      balances.map((balance) => (
                        <TableRow key={`${balance.leave_type_id}-${balance.year}`}>
                          <TableCell>
                            {balance.leave_type_name_zh} ({balance.leave_type_code})
                          </TableCell>
                          <TableCell align="right">
                            <strong>{parseFloat(balance.total || 0).toFixed(1)}</strong>
                          </TableCell>
                          <TableCell align="right">{parseFloat(balance.taken || 0).toFixed(1)}</TableCell>
                          <TableCell align="right">
                            <strong>{parseFloat(balance.balance || 0).toFixed(1)}</strong>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {tabValue === 1 && (
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>日期</TableCell>
                      <TableCell>假期類型</TableCell>
                      <TableCell align="right">數量</TableCell>
                      <TableCell>有效期</TableCell>
                      <TableCell>備註</TableCell>
                      <TableCell>操作人</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">沒有交易記錄</TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {Object.keys(totalsByType).length > 0 && (
                          <TableRow sx={{ backgroundColor: 'action.hover' }}>
                            <TableCell colSpan={2}><strong>假期類型總計</strong></TableCell>
                            <TableCell colSpan={4}></TableCell>
                          </TableRow>
                        )}
                        {Object.entries(totalsByType).map(([typeId, typeData]) => (
                          <TableRow key={typeId} sx={{ backgroundColor: 'action.hover' }}>
                            <TableCell>
                              <strong>{typeData.leave_type_name_zh} ({typeData.leave_type_code})</strong>
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell align="right">
                              <Chip
                                label={`總計: ${typeData.total.toFixed(1)}`}
                                color="primary"
                                size="small"
                              />
                            </TableCell>
                            <TableCell colSpan={3}></TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ backgroundColor: 'action.hover' }}>
                          <TableCell colSpan={6}><strong>交易明細</strong></TableCell>
                        </TableRow>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {new Date(transaction.created_at).toLocaleString('zh-TW')}
                            </TableCell>
                            <TableCell>
                              {transaction.leave_type_name_zh} ({transaction.leave_type_code})
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={parseFloat(transaction.amount) > 0 ? `+${transaction.amount}` : transaction.amount}
                                color={parseFloat(transaction.amount) > 0 ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {transaction.start_date && transaction.end_date ? (
                                `${transaction.start_date} 至 ${transaction.end_date}`
                              ) : transaction.start_date ? (
                                `自 ${transaction.start_date} 起`
                              ) : transaction.end_date ? (
                                `至 ${transaction.end_date} 止`
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>{transaction.remarks || '-'}</TableCell>
                            <TableCell>
                              {transaction.created_by_name || '-'}
                              {transaction.created_by_employee_number && ` (${transaction.created_by_employee_number})`}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>添加假期餘額</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
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
                    {lt.name_zh} ({lt.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="數量"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              required
              inputProps={{ step: 0.5 }}
              helperText="正數為增加，負數為減少"
            />
            <TextField
              label="年份"
              type="number"
              value={formData.year}
              onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
              required
            />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="有效開始日期（可選）"
                value={formData.start_date}
                onChange={(date) => setFormData(prev => ({ ...prev, start_date: date }))}
                format="DD/MM/YYYY"
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="有效結束日期（可選）"
                value={formData.end_date}
                onChange={(date) => setFormData(prev => ({ ...prev, end_date: date }))}
                format="DD/MM/YYYY"
                slotProps={{ textField: { fullWidth: true } }}
                minDate={formData.start_date}
              />
            </LocalizationProvider>
            <TextField
              label="備註（可選）"
              multiline
              rows={3}
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} variant="contained">添加</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminBalances;
