import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  MenuItem,
  Alert,
  Grid,
  InputLabel,
  Select,
  FormControl,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const LeaveApplication = () => {
  const { user, isDeptHead } = useAuth();
  const [formData, setFormData] = useState({
    applicant_id: '',
    leave_type_id: '',
    start_date: null,
    end_date: null,
    days: '',
    reason: ''
  });
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    fetchLeaveTypes();
    if (isDeptHead) {
      fetchUsers();
    }
  }, [isDeptHead]);

  useEffect(() => {
    if (formData.leave_type_id && formData.applicant_id) {
      fetchBalance(formData.applicant_id, formData.leave_type_id);
    } else if (formData.leave_type_id && !isDeptHead) {
      fetchBalance(user.id, formData.leave_type_id);
    }
  }, [formData.leave_type_id, formData.applicant_id, user.id, isDeptHead]);

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const days = formData.end_date.diff(formData.start_date, 'day') + 1;
      setFormData(prev => ({ ...prev, days: days.toString() }));
    }
  }, [formData.start_date, formData.end_date]);

  const fetchLeaveTypes = async () => {
    try {
      const response = await axios.get('/api/leave-types');
      setLeaveTypes(response.data.leaveTypes);
    } catch (error) {
      console.error('Fetch leave types error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = isDeptHead 
        ? await axios.get('/api/users/department')
        : await axios.get('/api/admin/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  const fetchBalance = async (userId, leaveTypeId) => {
    try {
      const currentYear = new Date().getFullYear();
      const response = await axios.get('/api/leaves/balances', {
        params: { user_id: userId, year: currentYear }
      });
      const balances = response.data.balances || [];
      const selectedBalance = balances.find(b => b.leave_type_id === parseInt(leaveTypeId));
      setBalance(selectedBalance);
    } catch (error) {
      console.error('Fetch balance error:', error);
      setBalance(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        start_date: formData.start_date.format('YYYY-MM-DD'),
        end_date: formData.end_date.format('YYYY-MM-DD'),
        applicant_id: formData.applicant_id || user.id
      };

      const response = await axios.post('/api/leaves', submitData);
      setSuccess(`申請已提交，交易編號：${response.data.application.transaction_id}`);
      setFormData({
        applicant_id: '',
        leave_type_id: '',
        start_date: null,
        end_date: null,
        days: '',
        reason: ''
      });
      setBalance(null);
    } catch (error) {
      setError(error.response?.data?.message || '提交申請時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  const selectedLeaveType = leaveTypes.find(lt => lt.id === parseInt(formData.leave_type_id));

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          申請假期
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          {isDeptHead && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>申請人</InputLabel>
              <Select
                value={formData.applicant_id}
                label="申請人"
                onChange={(e) => setFormData(prev => ({ ...prev, applicant_id: e.target.value }))}
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name_zh} ({u.employee_number})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>假期類型</InputLabel>
            <Select
              value={formData.leave_type_id}
              label="假期類型"
              onChange={(e) => setFormData(prev => ({ ...prev, leave_type_id: e.target.value }))}
              required
            >
              {leaveTypes.map((lt) => (
                <MenuItem key={lt.id} value={lt.id}>
                  {lt.name_zh} ({lt.name})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedLeaveType?.requires_balance && balance && (
            <Box sx={{ mb: 2 }}>
              <Chip
                label={`可用餘額：${parseFloat(balance.balance).toFixed(1)} 天`}
                color={parseFloat(balance.balance) >= parseFloat(formData.days || 0) ? 'success' : 'error'}
                sx={{ mb: 1 }}
              />
            </Box>
          )}

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="開始日期"
                  value={formData.start_date}
                  onChange={(date) => setFormData(prev => ({ ...prev, start_date: date }))}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="結束日期"
                  value={formData.end_date}
                  onChange={(date) => setFormData(prev => ({ ...prev, end_date: date }))}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                  minDate={formData.start_date}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>

          <TextField
            fullWidth
            label="天數"
            type="number"
            value={formData.days}
            onChange={(e) => setFormData(prev => ({ ...prev, days: e.target.value }))}
            required
            sx={{ mb: 2 }}
            inputProps={{ min: 0.5, step: 0.5 }}
          />

          <TextField
            fullWidth
            label="原因"
            multiline
            rows={4}
            value={formData.reason}
            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            sx={{ mb: 2 }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
          >
            {loading ? '提交中...' : '提交申請'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default LeaveApplication;
