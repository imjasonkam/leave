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
  Chip,
  IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import YearSelector from '../components/YearSelector';

const AdminBalances = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [open, setOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
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
    setEditingTransaction(null);
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

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      user_id: transaction.user_id,
      leave_type_id: transaction.leave_type_id,
      amount: transaction.amount.toString(),
      year: transaction.year,
      start_date: transaction.start_date ? dayjs(transaction.start_date) : null,
      end_date: transaction.end_date ? dayjs(transaction.end_date) : null,
      remarks: transaction.remarks || ''
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
      
      if (editingTransaction) {
        // 更新現有交易
        await axios.put(`/api/admin/balance-transactions/${editingTransaction.id}`, submitData);
      } else {
        // 創建新交易
        await axios.post('/api/admin/balance-transactions', submitData);
      }
      
      setOpen(false);
      setEditingTransaction(null);
      fetchBalances();
      fetchTransactions();
    } catch (error) {
      alert(error.response?.data?.message || t('adminBalances.operationFailed'));
    }
  };


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
        {t('adminBalances.title')}
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>{t('adminBalances.user')}</InputLabel>
            <Select
              value={selectedUserId}
              label={t('adminBalances.user')}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.employee_number} ({u.display_name})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <YearSelector
            value={selectedYear}
            onChange={(year) => setSelectedYear(year)}
            labelKey="adminBalances.year"
            sx={{ minWidth: 150 }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>{t('adminBalances.leaveTypeOptional')}</InputLabel>
            <Select
              value={selectedLeaveTypeId}
              label={t('adminBalances.leaveTypeOptional')}
              onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
            >
              <MenuItem value="">{t('adminBalances.all')}</MenuItem>
              {leaveTypes.filter(lt => lt.requires_balance).map((lt) => (
                <MenuItem key={lt.id} value={lt.id}>
                  {lt.name_zh} ({lt.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box>
          <Button variant="contained" onClick={handleOpen} disabled={!selectedUserId}>
            {t('adminBalances.addBalance')}
          </Button>
        </Box>
      </Paper>

      {selectedUserId && (
        <>
          <Paper sx={{ mb: 2 }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label={t('adminBalances.balanceOverview')} />
              <Tab label={t('adminBalances.transactionHistory')} />
            </Tabs>
          </Paper>

          {tabValue === 0 && (
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('adminBalances.leaveType')}</TableCell>
                      <TableCell align="right">{t('adminBalances.total')}</TableCell>
                      <TableCell align="right">{t('adminBalances.taken')}</TableCell>
                      <TableCell align="right">{t('adminBalances.balance')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {balances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">{t('adminBalances.noBalanceRecords')}</TableCell>
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
                      <TableCell>{t('adminBalances.date')}</TableCell>
                      <TableCell>{t('adminBalances.leaveType')}</TableCell>
                      <TableCell align="right">{t('adminBalances.amount')}</TableCell>
                      <TableCell>{t('adminBalances.validPeriod')}</TableCell>
                      <TableCell>{t('adminBalances.remarks')}</TableCell>
                      <TableCell>{t('adminBalances.operator')}</TableCell>
                      <TableCell align="center">{t('adminBalances.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">{t('adminBalances.noTransactionRecords')}</TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {Object.keys(totalsByType).length > 0 && (
                          <TableRow sx={{ backgroundColor: 'action.hover' }}>
                            <TableCell colSpan={2}><strong>{t('adminBalances.leaveTypeTotal')}</strong></TableCell>
                            <TableCell colSpan={5}></TableCell>
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
                                label={`${t('adminBalances.totalLabel')} ${typeData.total.toFixed(1)}`}
                                color="primary"
                                size="small"
                              />
                            </TableCell>
                            <TableCell colSpan={4}></TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ backgroundColor: 'action.hover' }}>
                          <TableCell colSpan={7}><strong>{t('adminBalances.transactionDetails')}</strong></TableCell>
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
                                `${dayjs(transaction.start_date).format('YYYY-MM-DD')} ${t('adminBalances.to')} ${dayjs(transaction.end_date).format('YYYY-MM-DD')}`
                              ) : transaction.start_date ? (
                                `${t('adminBalances.since')} ${dayjs(transaction.start_date).format('YYYY-MM-DD')}`
                              ) : transaction.end_date ? (
                                `${t('adminBalances.until')} ${dayjs(transaction.end_date).format('YYYY-MM-DD')}`
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>{transaction.remarks || '-'}</TableCell>
                            <TableCell>
                              {transaction.created_by_name || '-'}
                              {transaction.created_by_employee_number && ` (${transaction.created_by_employee_number})`}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(transaction)}
                                color="primary"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
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

      <Dialog open={open} onClose={() => {
        setOpen(false);
        setEditingTransaction(null);
      }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTransaction ? t('adminBalances.editDialogTitle') : t('adminBalances.addDialogTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl>
              <InputLabel>{t('adminBalances.leaveType')}</InputLabel>
              <Select
                value={formData.leave_type_id}
                label={t('adminBalances.leaveType')}
                onChange={(e) => setFormData(prev => ({ ...prev, leave_type_id: e.target.value }))}
                required
                disabled={!!editingTransaction}
              >
                {leaveTypes.filter(lt => lt.requires_balance).map((lt) => (
                  <MenuItem key={lt.id} value={lt.id}>
                    {lt.name_zh} ({lt.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t('adminBalances.amount')}
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              required
              inputProps={{ step: 0.5 }}
              helperText={t('adminBalances.amountHelper')}
            />
            <YearSelector
              value={formData.year}
              onChange={(year) => setFormData(prev => ({ ...prev, year }))}
              labelKey="adminBalances.year"
              required
              disabled={!!editingTransaction}
            />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label={t('adminBalances.validStartDate')}
                value={formData.start_date}
                onChange={(date) => setFormData(prev => ({ ...prev, start_date: date }))}
                format="DD/MM/YYYY"
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label={t('adminBalances.validEndDate')}
                value={formData.end_date}
                onChange={(date) => setFormData(prev => ({ ...prev, end_date: date }))}
                format="DD/MM/YYYY"
                slotProps={{ textField: { fullWidth: true } }}
                minDate={formData.start_date}
              />
            </LocalizationProvider>
            <TextField
              label={t('adminBalances.remarks')}
              multiline
              rows={3}
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpen(false);
            setEditingTransaction(null);
          }}>{t('adminBalances.cancel')}</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingTransaction ? t('adminBalances.update') : t('adminBalances.add')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminBalances;
