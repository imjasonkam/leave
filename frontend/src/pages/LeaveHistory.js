import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar
} from '@mui/material';
import { Search as SearchIcon, Undo as UndoIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/dateFormat';

const LeaveHistory = () => {
  const { user, isSystemAdmin, isDeptHead } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reversalDialogOpen, setReversalDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [reversing, setReversing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = {};

      if (isSystemAdmin || isDeptHead) {
        // 管理角色可選擇查看自身與批核清單
        params.include_approver = 'true';
      }

      const response = await axios.get('/api/leaves', { params });
      setApplications(response.data.applications || []);
    } catch (error) {
      console.error('Fetch applications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusMap = {
      pending: 'warning',
      approved: 'success',
      rejected: 'error'
    };
    return statusMap[status] || 'default';
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: '待批核',
      approved: '已批准',
      rejected: '已拒絕'
    };
    return statusMap[status] || status;
  };

  const handleReversalClick = (application) => {
    setSelectedApplication(application);
    setReversalDialogOpen(true);
  };

  const handleReversalConfirm = async () => {
    if (!selectedApplication) return;

    try {
      setReversing(true);
      const response = await axios.post('/api/leaves/reverse', {
        application_id: selectedApplication.id
      });
      
      // 使用後端返回的消息
      const message = response.data.message || '銷假申請已提交';
      
      setSnackbar({
        open: true,
        message,
        severity: 'success'
      });
      
      setReversalDialogOpen(false);
      setSelectedApplication(null);
      
      // 重新載入申請列表
      await fetchApplications();
    } catch (error) {
      console.error('Reversal error:', error);
      const errorMessage = error.response?.data?.message || '提交銷假申請時發生錯誤';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setReversing(false);
    }
  };

  const handleReversalCancel = () => {
    setReversalDialogOpen(false);
    setSelectedApplication(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const canShowReversalButton = (application) => {
    // 只有已批核的申請才能銷假
    if (application.status !== 'approved') {
      return false;
    }
    
    // 如果已經被銷假，不顯示按鈕
    if (application.is_reversed) {
      return false;
    }
    
    // 如果是銷假交易本身，不顯示按鈕
    if (application.is_reversal_transaction) {
      return false;
    }
    
    // 檢查是否為 paper-flow 申請
    const isPaperFlow = application.is_paper_flow === true || application.flow_type === 'paper-flow';
    const isHRMember = user?.is_hr_member || user?.is_system_admin;
    
    // 如果是 paper-flow，只有 HR 成員可以看到銷假按鈕
    if (isPaperFlow) {
      return isHRMember;
    }
    
    // 如果是 e-flow，只有申請者本人才能看到銷假按鈕
    return application.user_id === user.id;
  };

  const filteredApplications = applications.filter(app => {
    const keyword = search.toLowerCase();
    const transactionId = app.transaction_id?.toString().toLowerCase() || '';
    const leaveTypeNameZh = app.leave_type_name_zh?.toLowerCase() || '';
    const applicantNameZh = app.applicant_display_name?.toLowerCase() || '';

    return (
      transactionId.includes(keyword) ||
      leaveTypeNameZh.includes(keyword) ||
      applicantNameZh.includes(keyword)
    );
  });

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        申請歷史
      </Typography>

      <Paper sx={{ mt: 2, p: 2 }}>
        <TextField
          fullWidth
          placeholder="搜尋交易編號、假期類型或申請人..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ mb: 2 }}
        />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>交易編號</TableCell>
                <TableCell>申請人</TableCell>
                <TableCell>假期類型</TableCell>
                <TableCell>年份</TableCell>
                <TableCell>開始日期</TableCell>
                <TableCell>結束日期</TableCell>
                <TableCell>天數</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">載入中...</TableCell>
                </TableRow>
              ) : filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">沒有申請記錄</TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((app) => (
                  <TableRow key={app.id} hover>
                    <TableCell>{app.transaction_id}</TableCell>
                    <TableCell>{app.applicant_display_name}</TableCell>
                    <TableCell>{app.leave_type_name_zh}</TableCell>
                    <TableCell>
                      {app.year || (app.start_date ? new Date(app.start_date).getFullYear() : '-')}年
                    </TableCell>
                    <TableCell>{formatDate(app.start_date)}</TableCell>
                    <TableCell>{formatDate(app.end_date)}</TableCell>
                    <TableCell>{app.days}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(app.status)}
                        color={getStatusColor(app.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(`/approval/${app.id}`)}
                        >
                          查看詳情
                        </Button>
                        {canShowReversalButton(app) && (
                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            startIcon={<UndoIcon />}
                            onClick={() => handleReversalClick(app)}
                          >
                            銷假
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 銷假確認對話框 */}
      <Dialog
        open={reversalDialogOpen}
        onClose={handleReversalCancel}
        aria-labelledby="reversal-dialog-title"
      >
        <DialogTitle id="reversal-dialog-title">確認銷假</DialogTitle>
        <DialogContent>
          <DialogContentText>
            您確定要申請銷假嗎？此操作將創建一個銷假申請，需要經過批核流程。
            {selectedApplication && (
              <>
                <br />
                <br />
                <strong>申請詳情：</strong>
                <br />
                交易編號：{selectedApplication.transaction_id}
                <br />
                假期類型：{selectedApplication.leave_type_name_zh}
                <br />
                日期：{formatDate(selectedApplication.start_date)} ~ {formatDate(selectedApplication.end_date)}
                <br />
                天數：{selectedApplication.days} 天
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReversalCancel} disabled={reversing}>
            取消
          </Button>
          <Button
            onClick={handleReversalConfirm}
            color="warning"
            variant="contained"
            disabled={reversing}
          >
            {reversing ? '提交中...' : '確認銷假'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 成功/錯誤提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LeaveHistory;

