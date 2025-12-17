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
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/dateFormat';

const LeaveHistory = () => {
  const { t, i18n } = useTranslation();
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
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // 只獲取使用者本人的申請記錄，不包含批核清單
      const params = {};

      const response = await axios.get('/api/leaves', { params });
      const allApplications = response.data.applications || [];
      
      // 過濾只顯示使用者本人的申請，且必須是 e-flow 或 paper-flow
      const myApplications = allApplications.filter(app => {
        // 確保是使用者本人的申請
        const isMyApplication = app.user_id === user.id;
        
        // 確保是 e-flow 或 paper-flow
        const isEFlow = app.flow_type === 'e-flow';
        const isPaperFlow = app.flow_type === 'paper-flow' || app.is_paper_flow === true;
        
        return isMyApplication && (isEFlow || isPaperFlow);
      });
      
      setApplications(myApplications);
    } catch (error) {
      console.error('Fetch applications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (application) => {
    // 如果已被銷假，顯示特殊顏色
    if (application.is_reversed === true) {
      return 'info';
    }
    
    const statusMap = {
      pending: 'warning',
      approved: 'success',
      rejected: 'error'
    };
    return statusMap[application.status] || 'default';
  };

  const getStatusText = (application) => {
    // 如果已被銷假，顯示「已銷假」
    if (application.is_reversed === true) {
      return t('leaveHistory.reversed');
    }
    
    const statusMap = {
      pending: t('leaveHistory.pending'),
      approved: t('leaveHistory.approved'),
      rejected: t('leaveHistory.rejected')
    };
    return statusMap[application.status] || application.status;
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
      const message = response.data.message || t('leaveHistory.reversalSubmitted');
      
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
      const errorMessage = error.response?.data?.message || t('leaveHistory.reversalError');
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

  const getFlowTypeText = (application) => {
    const isPaperFlow = application.is_paper_flow === true || application.flow_type === 'paper-flow';
    return isPaperFlow ? t('leaveHistory.paperFlow') : t('leaveHistory.eFlow');
  };

  const filteredApplications = applications.filter(app => {
    const keyword = search.toLowerCase();
    const transactionId = app.transaction_id?.toString().toLowerCase() || '';
    // 根據語言選擇假期類型名稱用於搜索
    const leaveTypeName = i18n.language === 'en'
      ? (app.leave_type_name || app.leave_type_name_zh || '').toLowerCase()
      : (app.leave_type_name_zh || app.leave_type_name || '').toLowerCase();
    const applicantNameZh = app.applicant_display_name?.toLowerCase() || '';
    const flowTypeText = getFlowTypeText(app).toLowerCase();

    return (
      transactionId.includes(keyword) ||
      leaveTypeName.includes(keyword) ||
      applicantNameZh.includes(keyword) ||
      flowTypeText.includes(keyword)
    );
  });

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t('leaveHistory.title')}
      </Typography>

      <Paper sx={{ mt: 2, p: 2 }}>
        <TextField
          fullWidth
          placeholder={t('leaveHistory.searchPlaceholder')}
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
                <TableCell>{t('leaveHistory.transactionId')}</TableCell>
                <TableCell>{t('leaveHistory.applicant')}</TableCell>
                <TableCell>{t('leaveHistory.leaveType')}</TableCell>
                <TableCell>{t('leaveHistory.flowType')}</TableCell>
                <TableCell>{t('leaveHistory.year')}</TableCell>
                <TableCell>{t('leaveHistory.startDate')}</TableCell>
                <TableCell>{t('leaveHistory.endDate')}</TableCell>
                <TableCell>{t('leaveHistory.days')}</TableCell>
                <TableCell>{t('leaveHistory.status')}</TableCell>
                <TableCell>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">{t('common.loading')}</TableCell>
                </TableRow>
              ) : filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">{t('leaveHistory.noApplications')}</TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((app) => (
                  <TableRow key={app.id} hover>
                    <TableCell>{app.transaction_id}</TableCell>
                    <TableCell>{app.applicant_display_name}</TableCell>
                    <TableCell>
                      {i18n.language === 'en' 
                        ? (app.leave_type_name || app.leave_type_name_zh || '')
                        : (app.leave_type_name_zh || app.leave_type_name || '')
                      }
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getFlowTypeText(app)}
                        color={app.is_paper_flow === true || app.flow_type === 'paper-flow' ? 'secondary' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {app.year || (app.start_date ? new Date(app.start_date).getFullYear() : '-')}{t('leaveHistory.yearSuffix')}
                    </TableCell>
                    <TableCell>{formatDate(app.start_date)}</TableCell>
                    <TableCell>{formatDate(app.end_date)}</TableCell>
                    <TableCell>{app.days}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(app)}
                        color={getStatusColor(app)}
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
                          {t('leaveHistory.viewDetails')}
                        </Button>
                        {canShowReversalButton(app) && (
                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            startIcon={<UndoIcon />}
                            onClick={() => handleReversalClick(app)}
                          >
                            {t('leaveHistory.reversal')}
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
        <DialogTitle id="reversal-dialog-title">{t('leaveHistory.confirmReversal')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('leaveHistory.confirmReversalMessage')}
            {selectedApplication && (
              <>
                <br />
                <br />
                <strong>{t('leaveHistory.applicationDetails')}</strong>
                <br />
                {t('leaveHistory.transactionIdLabel')}{selectedApplication.transaction_id}
                <br />
                {t('leaveHistory.leaveTypeLabel')}
                {i18n.language === 'en' 
                  ? (selectedApplication.leave_type_name || selectedApplication.leave_type_name_zh || '')
                  : (selectedApplication.leave_type_name_zh || selectedApplication.leave_type_name || '')
                }
                <br />
                {t('leaveHistory.dateLabel')}{formatDate(selectedApplication.start_date)} ~ {formatDate(selectedApplication.end_date)}
                <br />
                {t('leaveHistory.daysLabel')}{selectedApplication.days} {t('leaveHistory.days')}
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReversalCancel} disabled={reversing}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleReversalConfirm}
            color="warning"
            variant="contained"
            disabled={reversing}
          >
            {reversing ? t('leaveHistory.reversing') : t('leaveHistory.confirmReversal')}
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

