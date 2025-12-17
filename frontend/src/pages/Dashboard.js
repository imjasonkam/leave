import React, { useEffect, useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
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
  Chip,
  Alert,
  CircularProgress,
  Divider,
  useTheme,
  useMediaQuery,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  List as ListIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { formatDate } from '../utils/dateFormat';
import Swal from 'sweetalert2';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, isSystemAdmin, isDeptHead } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  // HR 待處理清單狀態
  const [hrTodos, setHrTodos] = useState([]);
  const [loadingHrTodos, setLoadingHrTodos] = useState(false);
  const [savingHrTodo, setSavingHrTodo] = useState(false);
  const [hrTodoDialogOpen, setHrTodoDialogOpen] = useState(false);
  const [editingHrTodo, setEditingHrTodo] = useState(null);
  const [hrTodoForm, setHrTodoForm] = useState({
    created_date: new Date().toISOString().split('T')[0],
    employee_number: '',
    employee_name: '',
    start_date: '',
    end_date: '',
    details: '',
    progress: 'pending'
  });

  // 個人待辦事項狀態
  const [myTodos, setMyTodos] = useState([]);
  const [loadingMyTodos, setLoadingMyTodos] = useState(false);
  const [savingMyTodo, setSavingMyTodo] = useState(false);
  const [myTodoDialogOpen, setMyTodoDialogOpen] = useState(false);
  const [editingMyTodo, setEditingMyTodo] = useState(null);
  const [myTodoForm, setMyTodoForm] = useState({
    title: '',
    description: '',
    status: 'pending',
    due_date: '',
    priority: 1
  });

  const isHRMember = user?.is_hr_member || user?.is_system_admin;

  useEffect(() => {
    if (isHRMember) {
      fetchHRTodos();
    }
    fetchMyTodos();
  }, [isHRMember]);

  // 獲取 HR 待處理清單
  const fetchHRTodos = async () => {
    try {
      setLoadingHrTodos(true);
      const response = await axios.get('/api/todos/hr');
      setHrTodos(response.data.todos || []);
    } catch (error) {
      console.error('Fetch HR todos error:', error);
      if (error.response?.status === 403) {
        await Swal.fire({
          icon: 'error',
          title: '權限不足',
          text: '只有HR Group成員可以查看HR待處理清單',
          confirmButtonText: '確定',
          confirmButtonColor: '#d33'
        });
      }
    } finally {
      setLoadingHrTodos(false);
    }
  };

  // 獲取個人待辦事項
  const fetchMyTodos = async () => {
    try {
      setLoadingMyTodos(true);
      const response = await axios.get('/api/todos/my');
      setMyTodos(response.data.todos || []);
    } catch (error) {
      console.error('Fetch my todos error:', error);
    } finally {
      setLoadingMyTodos(false);
    }
  };

  // ========== HR 待處理清單處理函數 ==========
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      return '';
    }
  };

  const handleOpenHRTodoDialog = (todo = null) => {
    if (todo) {
      setEditingHrTodo(todo);
      setHrTodoForm({
        created_date: formatDateForInput(todo.created_date) || new Date().toISOString().split('T')[0],
        employee_number: todo.employee_number || '',
        employee_name: todo.employee_name || '',
        start_date: formatDateForInput(todo.start_date) || '',
        end_date: formatDateForInput(todo.end_date) || '',
        details: todo.details || '',
        progress: todo.progress || 'pending'
      });
    } else {
      setEditingHrTodo(null);
      setHrTodoForm({
        created_date: new Date().toISOString().split('T')[0],
        employee_number: '',
        employee_name: '',
        start_date: '',
        end_date: '',
        details: '',
        progress: 'pending'
      });
    }
    setHrTodoDialogOpen(true);
  };

  const handleCloseHRTodoDialog = () => {
    setHrTodoDialogOpen(false);
    setEditingHrTodo(null);
  };

  const handleSaveHRTodo = async () => {
    if (savingHrTodo) return;

    try {
      setSavingHrTodo(true);

      if (!hrTodoForm.created_date) {
        await Swal.fire({
          icon: 'warning',
          title: '提示',
          text: '請填寫建立日期',
          confirmButtonText: '確定',
          confirmButtonColor: '#3085d6'
        });
        setSavingHrTodo(false);
        return;
      }

      if (editingHrTodo) {
        await axios.put(`/api/todos/hr/${editingHrTodo.id}`, hrTodoForm);
      } else {
        await axios.post('/api/todos/hr', hrTodoForm);
      }

      handleCloseHRTodoDialog();
      setSavingHrTodo(false);
      await fetchHRTodos();
      
      await Swal.fire({
        icon: 'success',
        title: '成功',
        text: editingHrTodo ? 'HR待處理項目更新成功' : 'HR待處理項目建立成功',
        confirmButtonText: '確定',
        confirmButtonColor: '#3085d6'
      });
    } catch (error) {
      console.error('Save HR todo error:', error);
      await Swal.fire({
        icon: 'error',
        title: '操作失敗',
        text: error.response?.data?.message || '操作失敗',
        confirmButtonText: '確定',
        confirmButtonColor: '#d33'
      });
      setSavingHrTodo(false);
    }
  };

  const handleDeleteHRTodo = async (id) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '確認刪除',
      text: '確定要刪除此HR待處理項目嗎？',
      showCancelButton: true,
      confirmButtonText: '確定',
      cancelButtonText: '取消',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`/api/todos/hr/${id}`);
      await Swal.fire({
        icon: 'success',
        title: '成功',
        text: 'HR待處理項目刪除成功',
        confirmButtonText: '確定',
        confirmButtonColor: '#3085d6'
      });
      await fetchHRTodos();
    } catch (error) {
      console.error('Delete HR todo error:', error);
      await Swal.fire({
        icon: 'error',
        title: '刪除失敗',
        text: error.response?.data?.message || '刪除失敗',
        confirmButtonText: '確定',
        confirmButtonColor: '#d33'
      });
    }
  };

  // ========== 個人待辦事項處理函數 ==========
  const handleOpenMyTodoDialog = (todo = null) => {
    if (todo) {
      setEditingMyTodo(todo);
      setMyTodoForm({
        title: todo.title || '',
        description: todo.description || '',
        status: todo.status || 'pending',
        due_date: formatDateForInput(todo.due_date) || '',
        priority: todo.priority || 1
      });
    } else {
      setEditingMyTodo(null);
      setMyTodoForm({
        title: '',
        description: '',
        status: 'pending',
        due_date: '',
        priority: 1
      });
    }
    setMyTodoDialogOpen(true);
  };

  const handleCloseMyTodoDialog = () => {
    setMyTodoDialogOpen(false);
    setEditingMyTodo(null);
  };

  const handleSaveMyTodo = async () => {
    if (savingMyTodo) return;

    try {
      setSavingMyTodo(true);

      if (!myTodoForm.title || myTodoForm.title.trim() === '') {
        await Swal.fire({
          icon: 'warning',
          title: '提示',
          text: '請填寫標題',
          confirmButtonText: '確定',
          confirmButtonColor: '#3085d6'
        });
        setSavingMyTodo(false);
        return;
      }

      if (editingMyTodo) {
        await axios.put(`/api/todos/my/${editingMyTodo.id}`, myTodoForm);
      } else {
        await axios.post('/api/todos/my', myTodoForm);
      }

      handleCloseMyTodoDialog();
      setSavingMyTodo(false);
      await fetchMyTodos();
      
      await Swal.fire({
        icon: 'success',
        title: '成功',
        text: editingMyTodo ? '個人待辦事項更新成功' : '個人待辦事項建立成功',
        confirmButtonText: '確定',
        confirmButtonColor: '#3085d6'
      });
    } catch (error) {
      console.error('Save my todo error:', error);
      await Swal.fire({
        icon: 'error',
        title: '操作失敗',
        text: error.response?.data?.message || '操作失敗',
        confirmButtonText: '確定',
        confirmButtonColor: '#d33'
      });
      setSavingMyTodo(false);
    }
  };

  const handleDeleteMyTodo = async (id) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '確認刪除',
      text: '確定要刪除此個人待辦事項嗎？',
      showCancelButton: true,
      confirmButtonText: '確定',
      cancelButtonText: '取消',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`/api/todos/my/${id}`);
      await Swal.fire({
        icon: 'success',
        title: '成功',
        text: '個人待辦事項刪除成功',
        confirmButtonText: '確定',
        confirmButtonColor: '#3085d6'
      });
      await fetchMyTodos();
    } catch (error) {
      console.error('Delete my todo error:', error);
      await Swal.fire({
        icon: 'error',
        title: '刪除失敗',
        text: error.response?.data?.message || '刪除失敗',
        confirmButtonText: '確定',
        confirmButtonColor: '#d33'
      });
    }
  };

  const getProgressColor = (progress) => {
    switch (progress) {
      case 'pending':
        return 'default';
      case 'in_progress':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getProgressLabel = (progress) => {
    switch (progress) {
      case 'pending':
        return t('dashboard.hrTodo.progress.pending');
      case 'in_progress':
        return t('dashboard.hrTodo.progress.in_progress');
      case 'completed':
        return t('dashboard.hrTodo.progress.completed');
      case 'cancelled':
        return t('dashboard.hrTodo.progress.cancelled');
      default:
        return progress;
    }
  };

  return (
    <Box>
      <Typography 
        variant={isMobile ? "h5" : "h4"} 
        gutterBottom
        sx={{ wordBreak: 'break-word' }}
      >
        {t('dashboard.welcome', { name: user?.display_name || `${user?.surname} ${user?.given_name}` })}
      </Typography>
      <Typography 
        variant="body1" 
        color="text.secondary" 
        sx={{ mb: 3, wordBreak: 'break-word' }}
      >
        {user?.department_name_zh} - {user?.position_name_zh}
      </Typography>

      {/* HR 待處理清單（僅 HR Group 成員可見） */}
      {isHRMember && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 3 }} />
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: isMobile ? 'flex-start' : 'center',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? 2 : 0,
              mb: 2 
            }}
          >
            <Typography variant="h5" gutterBottom={isMobile}>
              <ListIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              {t('dashboard.hrTodo.title')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenHRTodoDialog()}
              fullWidth={isMobile}
              size={isMobile ? 'medium' : 'medium'}
            >
              {t('dashboard.hrTodo.add')}
            </Button>
          </Box>

          {loadingHrTodos ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : hrTodos.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                {t('dashboard.hrTodo.noTodos')}
              </Typography>
            </Paper>
          ) : isMobile ? (
            <Stack spacing={2}>
              {hrTodos.map((todo) => (
                <Card key={todo.id} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Chip
                        label={getProgressLabel(todo.progress)}
                        color={getProgressColor(todo.progress)}
                        size="small"
                      />
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenHRTodoDialog(todo)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteHRTodo(todo.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    <Stack spacing={1}>
                      {todo.created_date && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t('dashboard.hrTodo.createdDate')}:
                          </Typography>
                          <Typography variant="body2">{formatDate(todo.created_date)}</Typography>
                        </Box>
                      )}
                      {todo.employee_number && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t('dashboard.hrTodo.employeeNumber')}:
                          </Typography>
                          <Typography variant="body2">{todo.employee_number}</Typography>
                        </Box>
                      )}
                      {todo.employee_name && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t('dashboard.hrTodo.employeeName')}:
                          </Typography>
                          <Typography variant="body2">{todo.employee_name}</Typography>
                        </Box>
                      )}
                      {(todo.start_date || todo.end_date) && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t('dashboard.hrTodo.startDate')} - {t('dashboard.hrTodo.endDate')}:
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(todo.start_date) || '-'} ~ {formatDate(todo.end_date) || '-'}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <TableContainer 
              component={Paper}
              sx={{ 
                maxHeight: isTablet ? '600px' : 'none',
                overflowX: 'auto'
              }}
            >
              <Table stickyHeader={isTablet}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 100 }}>{t('dashboard.hrTodo.createdDate')}</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>{t('dashboard.hrTodo.employeeNumber')}</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>{t('dashboard.hrTodo.employeeName')}</TableCell>
                    {!isTablet && (
                      <>
                        <TableCell sx={{ minWidth: 100 }}>{t('dashboard.hrTodo.startDate')}</TableCell>
                        <TableCell sx={{ minWidth: 100 }}>{t('dashboard.hrTodo.endDate')}</TableCell>
                      </>
                    )}
                    <TableCell sx={{ minWidth: 100 }}>{t('dashboard.hrTodo.progress.label')}</TableCell>
                    <TableCell align="right" sx={{ minWidth: 100 }}>{t('dashboard.hrTodo.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hrTodos.map((todo) => (
                    <TableRow key={todo.id} hover>
                      <TableCell>{formatDate(todo.created_date) || '-'}</TableCell>
                      <TableCell>{todo.employee_number || '-'}</TableCell>
                      <TableCell>{todo.employee_name || '-'}</TableCell>
                      {!isTablet && (
                        <>
                          <TableCell>{formatDate(todo.start_date) || '-'}</TableCell>
                          <TableCell>{formatDate(todo.end_date) || '-'}</TableCell>
                        </>
                      )}
                      <TableCell>
                        <Chip
                          label={getProgressLabel(todo.progress)}
                          color={getProgressColor(todo.progress)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenHRTodoDialog(todo)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteHRTodo(todo.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* 個人待辦事項清單（所有用戶可見） */}
      <Box sx={{ mt: 4 }}>
        <Divider sx={{ mb: 3 }} />
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 2 : 0,
            mb: 2 
          }}
        >
          <Typography variant="h5" gutterBottom={isMobile}>
            <ListIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            {t('dashboard.myTodo.title')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenMyTodoDialog()}
            fullWidth={isMobile}
            size={isMobile ? 'medium' : 'medium'}
          >
            {t('dashboard.myTodo.add')}
          </Button>
        </Box>

        {loadingMyTodos ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : myTodos.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              {t('dashboard.myTodo.noTodos')}
            </Typography>
          </Paper>
        ) : isMobile ? (
          <Stack spacing={2}>
            {myTodos.map((todo) => (
              <Card key={todo.id} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={t(`dashboard.myTodo.status.${todo.status}`)}
                        color={todo.status === 'completed' ? 'success' : todo.status === 'in_progress' ? 'primary' : 'default'}
                        size="small"
                      />
                      <Chip
                        label={t(`dashboard.myTodo.priority.${todo.priority}`)}
                        color={todo.priority === 3 ? 'error' : todo.priority === 2 ? 'warning' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenMyTodoDialog(todo)}
                        color="primary"
                        sx={{ mr: 0.5 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteMyTodo(todo.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {todo.title}
                      </Typography>
                    </Box>
                    {todo.description && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {todo.description}
                        </Typography>
                      </Box>
                    )}
                    {todo.due_date && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t('dashboard.myTodo.dueDate')}: {formatDate(todo.due_date)}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <TableContainer 
            component={Paper}
            sx={{ 
              maxHeight: isTablet ? '600px' : 'none',
              overflowX: 'auto'
            }}
          >
            <Table stickyHeader={isTablet}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 200 }}>{t('dashboard.myTodo.title')}</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>{t('dashboard.myTodo.description')}</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>{t('dashboard.myTodo.status.label')}</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>{t('dashboard.myTodo.priority.label')}</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>{t('dashboard.myTodo.dueDate')}</TableCell>
                  <TableCell align="right" sx={{ minWidth: 100 }}>{t('dashboard.myTodo.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myTodos.map((todo) => (
                  <TableRow key={todo.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {todo.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {todo.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t(`dashboard.myTodo.status.${todo.status}`)}
                        color={todo.status === 'completed' ? 'success' : todo.status === 'in_progress' ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t(`dashboard.myTodo.priority.${todo.priority}`)}
                        color={todo.priority === 3 ? 'error' : todo.priority === 2 ? 'warning' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(todo.due_date) || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenMyTodoDialog(todo)}
                        color="primary"
                        sx={{ mr: 0.5 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteMyTodo(todo.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* HR 待處理清單對話框 */}
      {isHRMember && (
        <Dialog 
          open={hrTodoDialogOpen} 
          onClose={handleCloseHRTodoDialog} 
          maxWidth="md" 
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            {editingHrTodo ? t('dashboard.hrTodo.edit') : t('dashboard.hrTodo.add')}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('dashboard.hrTodo.createdDate')}
                  type="date"
                  value={hrTodoForm.created_date}
                  onChange={(e) => setHrTodoForm({ ...hrTodoForm, created_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('dashboard.hrTodo.employeeNumber')}
                  value={hrTodoForm.employee_number}
                  onChange={(e) => setHrTodoForm({ ...hrTodoForm, employee_number: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('dashboard.hrTodo.employeeName')}
                  value={hrTodoForm.employee_name}
                  onChange={(e) => setHrTodoForm({ ...hrTodoForm, employee_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('dashboard.hrTodo.startDate')}
                  type="date"
                  value={hrTodoForm.start_date}
                  onChange={(e) => setHrTodoForm({ ...hrTodoForm, start_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('dashboard.hrTodo.endDate')}
                  type="date"
                  value={hrTodoForm.end_date}
                  onChange={(e) => setHrTodoForm({ ...hrTodoForm, end_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('dashboard.hrTodo.progress.label')}</InputLabel>
                  <Select
                    value={hrTodoForm.progress}
                    onChange={(e) => setHrTodoForm({ ...hrTodoForm, progress: e.target.value })}
                    label={t('dashboard.hrTodo.progress.label')}
                  >
                    <MenuItem value="pending">{t('dashboard.hrTodo.progress.pending')}</MenuItem>
                    <MenuItem value="in_progress">{t('dashboard.hrTodo.progress.in_progress')}</MenuItem>
                    <MenuItem value="completed">{t('dashboard.hrTodo.progress.completed')}</MenuItem>
                    <MenuItem value="cancelled">{t('dashboard.hrTodo.progress.cancelled')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('dashboard.hrTodo.details')}
                  multiline
                  rows={4}
                  value={hrTodoForm.details}
                  onChange={(e) => setHrTodoForm({ ...hrTodoForm, details: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ flexDirection: isMobile ? 'column-reverse' : 'row', gap: isMobile ? 1 : 0 }}>
            <Button 
              onClick={handleCloseHRTodoDialog}
              fullWidth={isMobile}
              size={isMobile ? 'large' : 'medium'}
            >
              {t('dashboard.hrTodo.cancel')}
            </Button>
            <Button 
              onClick={handleSaveHRTodo} 
              variant="contained"
              fullWidth={isMobile}
              size={isMobile ? 'large' : 'medium'}
              disabled={savingHrTodo}
            >
              {savingHrTodo ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  {t('dashboard.hrTodo.saving') || '儲存中...'}
                </>
              ) : (
                t('dashboard.hrTodo.save')
              )}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* 個人待辦事項對話框 */}
      <Dialog 
        open={myTodoDialogOpen} 
        onClose={handleCloseMyTodoDialog} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {editingMyTodo ? t('dashboard.myTodo.edit') : t('dashboard.myTodo.add')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('dashboard.myTodo.title')}
                value={myTodoForm.title}
                onChange={(e) => setMyTodoForm({ ...myTodoForm, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('dashboard.myTodo.description')}
                multiline
                rows={3}
                value={myTodoForm.description}
                onChange={(e) => setMyTodoForm({ ...myTodoForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('dashboard.myTodo.status.label')}</InputLabel>
                <Select
                  value={myTodoForm.status}
                  onChange={(e) => setMyTodoForm({ ...myTodoForm, status: e.target.value })}
                  label={t('dashboard.myTodo.status.label')}
                >
                  <MenuItem value="pending">{t('dashboard.myTodo.status.pending')}</MenuItem>
                  <MenuItem value="in_progress">{t('dashboard.myTodo.status.in_progress')}</MenuItem>
                  <MenuItem value="completed">{t('dashboard.myTodo.status.completed')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('dashboard.myTodo.priority.label')}</InputLabel>
                <Select
                  value={myTodoForm.priority}
                  onChange={(e) => setMyTodoForm({ ...myTodoForm, priority: Number(e.target.value) })}
                  label={t('dashboard.myTodo.priority.label')}
                >
                  <MenuItem value={1}>{t('dashboard.myTodo.priority.1')}</MenuItem>
                  <MenuItem value={2}>{t('dashboard.myTodo.priority.2')}</MenuItem>
                  <MenuItem value={3}>{t('dashboard.myTodo.priority.3')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('dashboard.myTodo.dueDate')}
                type="date"
                value={myTodoForm.due_date}
                onChange={(e) => setMyTodoForm({ ...myTodoForm, due_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ flexDirection: isMobile ? 'column-reverse' : 'row', gap: isMobile ? 1 : 0 }}>
          <Button 
            onClick={handleCloseMyTodoDialog}
            fullWidth={isMobile}
            size={isMobile ? 'large' : 'medium'}
          >
            {t('dashboard.myTodo.cancel')}
          </Button>
          <Button 
            onClick={handleSaveMyTodo} 
            variant="contained"
            fullWidth={isMobile}
            size={isMobile ? 'large' : 'medium'}
            disabled={savingMyTodo}
          >
            {savingMyTodo ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                {t('dashboard.myTodo.saving') || '儲存中...'}
              </>
            ) : (
              t('dashboard.myTodo.save')
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;

