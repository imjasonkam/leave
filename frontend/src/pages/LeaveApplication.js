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
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  LinearProgress,
  FormControlLabel,
  Switch
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Delete as DeleteIcon, AttachFile as AttachFileIcon, CameraAlt as CameraIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const LeaveApplication = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: null,
    end_date: null,
    days: '',
    reason: ''
  });
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [balance, setBalance] = useState(null);
  const [files, setFiles] = useState([]);
  const [includeWeekends, setIncludeWeekends] = useState(true); // 預設包含週末

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  useEffect(() => {
    if (formData.leave_type_id) {
      fetchBalance(user.id, formData.leave_type_id);
    }
  }, [formData.leave_type_id, user.id]);

  // 計算工作日（排除週末）
  const calculateWorkingDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    
    let count = 0;
    let current = dayjs(startDate);
    const end = dayjs(endDate);
    
    // 使用 isBefore 和 isSame 來替代 isSameOrBefore
    while (current.isBefore(end, 'day') || current.isSame(end, 'day')) {
      const dayOfWeek = current.day(); // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current = current.add(1, 'day');
    }
    
    return count;
  };

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      let days;
      if (includeWeekends) {
        // 包含週末：計算總天數
        days = formData.end_date.diff(formData.start_date, 'day') + 1;
      } else {
        // 不包含週末：只計算工作日
        days = calculateWorkingDays(formData.start_date, formData.end_date);
      }
      setFormData(prev => ({ ...prev, days: days > 0 ? days.toString() : '' }));
    }
  }, [formData.start_date, formData.end_date, includeWeekends]);

  const fetchLeaveTypes = async () => {
    try {
      const response = await axios.get('/api/leave-types');
      setLeaveTypes(response.data.leaveTypes);
    } catch (error) {
      console.error('Fetch leave types error:', error);
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

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // 驗證文件類型和大小
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff', 'image/tif', 'application/pdf'];
    const allowedExtensions = ['.pdf', '.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    const validFiles = [];
    const errors = [];
    
    selectedFiles.forEach((file) => {
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExt);
      const isValidSize = file.size <= maxSize;
      
      if (!isValidType) {
        errors.push(`${file.name}: 不支援的檔案類型。只允許：${allowedExtensions.join(', ')}`);
      } else if (!isValidSize) {
        errors.push(`${file.name}: 檔案大小超過 5MB`);
      } else {
        validFiles.push(file);
      }
    });
    
    if (errors.length > 0) {
      setError(errors.join('\n'));
      setTimeout(() => setError(''), 5000);
    }
    
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // 使用後置攝像頭
    input.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileChange(e);
      }
    };
    input.click();
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!formData.leave_type_id || !formData.start_date || !formData.end_date || !formData.days) {
      setError('請填寫所有必填欄位');
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('user_id', user.id);
      formDataToSend.append('leave_type_id', formData.leave_type_id);
      formDataToSend.append('start_date', formData.start_date.format('YYYY-MM-DD'));
      formDataToSend.append('end_date', formData.end_date.format('YYYY-MM-DD'));
      formDataToSend.append('total_days', parseFloat(formData.days));
      if (formData.reason) {
        formDataToSend.append('reason', formData.reason);
      }
      
      // 添加文件
      files.forEach((file) => {
        formDataToSend.append('files', file);
      });

      const response = await axios.post('/api/leaves', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSuccess(`申請已提交，交易編號：${response.data.application.transaction_id}`);
      setFormData({
        leave_type_id: '',
        start_date: null,
        end_date: null,
        days: '',
        reason: ''
      });
      setFiles([]);
      setBalance(null);
      setIncludeWeekends(true); // 重置為預設值
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
                  format="DD/MM/YYYY"
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="結束日期"
                  value={formData.end_date}
                  onChange={(date) => setFormData(prev => ({ ...prev, end_date: date }))}
                  format="DD/MM/YYYY"
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                  minDate={formData.start_date}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>

          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={includeWeekends}
                  onChange={(e) => setIncludeWeekends(e.target.checked)}
                  color="primary"
                />
              }
              label="計算星期六及星期日"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {includeWeekends 
                ? '將計算開始日期至結束日期之間的所有天數（包括星期六及星期日）'
                : '只計算工作日（星期一至星期五），星期六及星期日將不計入假期天數'}
            </Typography>
          </Box>

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

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              附件（可選，支持 PDF、JPEG、JPG、TIFF 及其他圖片格式，每個文件不超過 5MB）
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFileIcon />}
              >
                選擇文件
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".pdf,.jpeg,.jpg,.png,.gif,.bmp,.webp,.tiff,.tif,image/*"
                  onChange={handleFileChange}
                />
              </Button>
              <Button
                variant="outlined"
                startIcon={<CameraIcon />}
                onClick={handleCameraCapture}
              >
                拍照
              </Button>
            </Box>
            {files.length > 0 && (
              <List dense>
                {files.map((file, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        aria-label="刪除"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={file.name}
                      secondary={formatFileSize(file.size)}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          {loading && (
            <LinearProgress sx={{ mb: 2 }} />
          )}

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
