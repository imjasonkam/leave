import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Chip,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  IconButton,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Visibility as VisibilityIcon, GetApp as GetAppIcon, Description as DescriptionIcon, Image as ImageIcon, Close as CloseIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTime, formatDate } from '../utils/dateFormat';

const ApprovalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [comment, setComment] = useState('');
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [canApproveThis, setCanApproveThis] = useState(false);
  const [canRejectThis, setCanRejectThis] = useState(false);
  const [userApprovalStage, setUserApprovalStage] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [fileBlobUrl, setFileBlobUrl] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [hrRejectionReason, setHrRejectionReason] = useState('');
  const [hrRejecting, setHrRejecting] = useState(false);

  useEffect(() => {
    fetchApplication();
  }, [id]);

  useEffect(() => {
    if (application && user) {
      checkCanApprove();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application, user, id]);

  useEffect(() => {
    if (application) {
      fetchDocuments();
    }
  }, [application, id]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`/api/leaves/${id}`);
      setApplication(response.data.application);
    } catch (error) {
      console.error('Fetch application error:', error);
      if (error.response?.status === 403) {
        setError('無權限查看此申請');
      } else if (error.response?.status === 404) {
        setError('申請不存在');
      } else {
        setError('獲取申請詳情時發生錯誤');
      }
      setApplication(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`/api/leaves/${id}/documents`);
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Fetch documents error:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType, fileName) => {
    if (fileType && fileType.startsWith('image/')) {
      return <ImageIcon />;
    }
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return <DescriptionIcon />;
    }
    return <DescriptionIcon />;
  };

  const getCurrentStage = (app) => {
    // 優先使用後端返回的 current_approval_stage
    if (app.current_approval_stage) {
      const stageMap = {
        'checker': { stage: 'checker', text: '檢查' },
        'approver_1': { stage: 'approver_1', text: '第一批核' },
        'approver_2': { stage: 'approver_2', text: '第二批核' },
        'approver_3': { stage: 'approver_3', text: '第三批核' },
        'completed': { stage: 'completed', text: '已完成' }
      };
      return stageMap[app.current_approval_stage] || { stage: 'checker', text: '檢查' };
    }
    // Fallback: 如果沒有 current_approval_stage，使用舊的邏輯
    // if (!app.checker_at && app.checker_id) return { stage: 'checker', text: '檢查' };
    // if (!app.approver_1_at && app.approver_1_id) return { stage: 'approver_1', text: '第一批核' };
    // if (!app.approver_2_at && app.approver_2_id) return { stage: 'approver_2', text: '第二批核' };
    // if (!app.approver_3_at && app.approver_3_id) return { stage: 'approver_3', text: '第三批核' };
    // return { stage: 'completed', text: '已完成' };
  };

  const checkCanApprove = async () => {
    if (!application || application.status !== 'pending') {
      setCanApproveThis(false);
      setCanRejectThis(false);
      setUserApprovalStage(null);
      return;
    }
    
    // 確定當前申請處於哪個階段（必須按順序：checker -> approver_1 -> approver_2 -> approver_3）
    // 優先使用後端返回的 current_approval_stage
    const currentStage = application.current_approval_stage || getCurrentStage(application).stage;

    
    // 如果已經完成所有批核階段，不顯示批核操作
    if (currentStage === 'completed') {
      setCanApproveThis(false);
      setCanRejectThis(false);
      setUserApprovalStage(null);
      return;
    }
    
    // 檢查用戶是否屬於當前階段的批核者（直接設置或通過授權群組）
    let isCurrentStageApprover = false;
    
    // 方法1：檢查是否直接設置為當前階段的批核者，且該階段尚未批核
    if (currentStage === 'checker' && application.checker_id === user?.id && !application.checker_at) {
      isCurrentStageApprover = true;
    } else if (currentStage === 'approver_1' && application.approver_1_id === user?.id && !application.approver_1_at) {
      isCurrentStageApprover = true;
    } else if (currentStage === 'approver_2' && application.approver_2_id === user?.id && !application.approver_2_at) {
      isCurrentStageApprover = true;
    } else if (currentStage === 'approver_3' && application.approver_3_id === user?.id && !application.approver_3_at) {
      isCurrentStageApprover = true;
    }
    
    // 方法2：如果不是直接批核者，檢查是否通過授權群組屬於當前階段的批核者
    if (!isCurrentStageApprover) {
      try {
        // 調用後端 API 檢查用戶是否有權限批核當前階段
        // 後端的 can-approve 現在只返回當前階段的權限
        const response = await axios.get(`/api/users/can-approve/${id}`);
        const canApproveFromBackend = response.data.canApprove || false;
        
        if (canApproveFromBackend) {
          // 後端返回可以批核，說明用戶是當前階段的批核者
          isCurrentStageApprover = true;
        }
      } catch (error) {
        console.error('Check approval permission error:', error);
      }
    }
    
    // 如果用戶是當前階段的批核者，按照正常流程處理
    // 這包括：直接設置為批核者，或通過授權群組屬於當前階段的批核者
    // 無論用戶是否是 HR Group 成員，只要是用戶是當前階段的批核者，就可以批准和拒絕
    if (isCurrentStageApprover) {
      setCanApproveThis(true);
      setCanRejectThis(true);
      setUserApprovalStage(currentStage);
      return;
    }
    
    // 未輪到的批核者只能查看申請資料，不能批核（不顯示批核操作 div）
    setCanApproveThis(false);
    setCanRejectThis(false);
    setUserApprovalStage(null);
  };

  const handleSubmit = async () => {
    if (!application) return;

    setError('');
    setSuccess('');
    setApproving(true);

    try {
      await axios.post(`/api/approvals/${id}/approve`, {
        action,
        remarks: comment
      });

      setSuccess(action === 'approve' ? '批核成功' : '已拒絕');
      setTimeout(() => {
        navigate('/approval/list');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || '操作失敗');
    } finally {
      setApproving(false);
    }
  };

  const handleHRReject = async () => {
    if (!application) return;

    setError('');
    setSuccess('');
    setHrRejecting(true);

    try {
      await axios.post(`/api/approvals/${id}/approve`, {
        action: 'reject',
        remarks: hrRejectionReason || 'HR Group 拒絕申請'
      });

      setSuccess('申請已拒絕');
      setTimeout(() => {
        navigate('/approval/list');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || '拒絕操作失敗');
    } finally {
      setHrRejecting(false);
    }
  };

  const handleOpenFile = async (doc) => {
    try {
      setLoadingFile(true);
      setViewingFile(doc);
      setFileDialogOpen(true);

      const isImage = doc.file_type && doc.file_type.startsWith('image/');
      const isPDF = doc.file_type === 'application/pdf' || doc.file_name?.toLowerCase().endsWith('.pdf');
      const url = `/api/leaves/documents/${doc.id}/download${isImage || isPDF ? '?view=true' : ''}`;
      
      // 使用 axios 下載文件，確保認證 header 被包含
      const response = await axios.get(url, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // 從響應中獲取正確的 MIME 類型
      const contentType = response.headers['content-type'] || doc.file_type || 'application/octet-stream';
      
      // 創建 blob URL（使用正確的 MIME 類型）
      const blob = new Blob([response.data], { type: contentType });
      const blobUrl = window.URL.createObjectURL(blob);
      setFileBlobUrl(blobUrl);
    } catch (error) {
      console.error('下載文件錯誤:', error);
      setFileDialogOpen(false);
      setViewingFile(null);
      if (error.response?.status === 403 || error.response?.status === 401) {
        setError('無權限查看此文件');
      } else {
        setError('無法打開文件，請檢查權限');
      }
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoadingFile(false);
    }
  };

  const handleCloseFileDialog = () => {
    if (fileBlobUrl) {
      window.URL.revokeObjectURL(fileBlobUrl);
      setFileBlobUrl(null);
    }
    setFileDialogOpen(false);
    setViewingFile(null);
  };

  if (loading) {
    return <Box>載入中...</Box>;
  }

  if (!application) {
    return <Box>申請不存在</Box>;
  }

  // 優先使用後端返回的 current_approval_stage
  const currentStage = application.current_approval_stage || getCurrentStage(application).stage;
  const { text } = getCurrentStage(application);
  // 如果用戶有特定的批核階段，使用該階段；否則使用當前階段
  const displayStage = userApprovalStage || currentStage;
  const displayText = userApprovalStage === 'checker' ? '檢查' :
                      userApprovalStage === 'approver_1' ? '第一批核' :
                      userApprovalStage === 'approver_2' ? '第二批核' :
                      userApprovalStage === 'approver_3' ? '第三批核' :
                      text;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        申請詳情
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

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              申請資訊
            </Typography>

            <List>
              <ListItem>
                <ListItemText 
                  primary="交易編號"
                  secondary={application.transaction_id}
                  primaryTypographyProps={{ variant: 'caption' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="申請人"
                  secondary={application.applicant_display_name}
                  primaryTypographyProps={{ variant: 'caption' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="假期類型"
                  secondary={application.leave_type_name_zh}
                  primaryTypographyProps={{ variant: 'caption' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="年份"
                  secondary={application.year || (application.start_date ? new Date(application.start_date).getFullYear() : '-') + '年'}
                  primaryTypographyProps={{ variant: 'caption' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="開始日期"
                  secondary={formatDate(application.start_date)}
                  primaryTypographyProps={{ variant: 'caption' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="結束日期"
                  secondary={formatDate(application.end_date)}
                  primaryTypographyProps={{ variant: 'caption' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="天數"
                  secondary={application.days}
                  primaryTypographyProps={{ variant: 'caption' }}
                  secondaryTypographyProps={{ variant: 'body1' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="狀態"
                  secondary={
                    <Chip
                      label={application.status === 'pending' ? '待批核' : application.status === 'approved' ? '已批准' : '已拒絕'}
                      color={application.status === 'pending' ? 'warning' : application.status === 'approved' ? 'success' : 'error'}
                      size="small"
                    />
                  }
                  primaryTypographyProps={{ variant: 'caption' }}
                  secondaryTypographyProps={{ variant: 'body1', component: 'div' }}
                />
              </ListItem>
              {application.reason && (
                <ListItem>
                  <ListItemText 
                    primary="原因"
                    secondary={application.reason}
                    primaryTypographyProps={{ variant: 'caption' }}
                    secondaryTypographyProps={{ variant: 'body1' }}
                  />
                </ListItem>
              )}
            </List>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              批核流程
            </Typography>

            <List>
              <ListItem>
                <ListItemText
                  primary="待核實"
                  secondary={
                    <Box>
                      <Box>
                        {application.checker_at 
                          ? `已檢查於 ${formatDateTime(application.checker_at)}${application.checker_name ? ` - ${application.checker_name}` : ''}` 
                          : '待檢查'}
                      </Box>
                      {application.checker_remarks && (
                        <Typography variant="body2" sx={{ color: '#1565C0', mt: 1 }}>
                          {application.checker_remarks}
                        </Typography>
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{ variant: 'caption' }}
                  secondaryTypographyProps={{ variant: 'body1', component: 'div' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="首階段批核"
                  secondary={
                    <Box>
                      <Box>
                        {application.approver_1_at 
                          ? `已批核於 ${formatDateTime(application.approver_1_at)}${application.approver_1_name ? ` - ${application.approver_1_name}` : ''}` 
                          : application.checker_at ? '待批核' : '未開始'}
                      </Box>
                      {application.approver_1_remarks && (
                        <Typography variant="body2" sx={{ color: '#1565C0', mt: 1 }}>
                          {application.approver_1_remarks}
                        </Typography>
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{ variant: 'caption' }}
                  secondaryTypographyProps={{ variant: 'body1', component: 'div' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="次階段批核"
                  secondary={
                    <Box>
                      <Box>
                        {application.approver_2_at 
                          ? `已批核於 ${formatDateTime(application.approver_2_at)}${application.approver_2_name ? ` - ${application.approver_2_name}` : ''}` 
                          : application.approver_1_at ? '待批核' : '未開始'}
                      </Box>
                      {application.approver_2_remarks && (
                        <Typography variant="body2" sx={{ color: '#1565C0', mt: 1 }}>
                          {application.approver_2_remarks}
                        </Typography>
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{ variant: 'caption' }}
                  secondaryTypographyProps={{ variant: 'body1', component: 'div' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="最終批核"
                  secondary={
                    <Box>
                      <Box>
                        {application.approver_3_at 
                          ? `已批核於 ${formatDateTime(application.approver_3_at)}${application.approver_3_name ? ` - ${application.approver_3_name}` : ''}` 
                          : application.approver_2_at ? '待批核' : '未開始'}
                      </Box>
                      {application.approver_3_remarks && (
                        <Typography variant="body2" sx={{ color: '#1565C0', mt: 1 }}>
                          {application.approver_3_remarks}
                        </Typography>
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{ variant: 'caption' }}
                  secondaryTypographyProps={{ variant: 'body1', component: 'div' }}
                />
              </ListItem>
              {application.status === 'rejected' && application.rejected_by_name && (
                <ListItem>
                  <ListItemText
                    primary="拒絕"
                    secondary={
                      <Box>
                        <Box>
                          已拒絕於 {formatDateTime(application.rejected_at)} - {application.rejected_by_name}
                        </Box>
                        {application.rejection_reason && (
                          <Typography variant="body2" sx={{ color: '#1565C0', mt: 1 }}>
                            {application.rejection_reason}
                          </Typography>
                        )}
                      </Box>
                    }
                    primaryTypographyProps={{ variant: 'caption' }}
                    secondaryTypographyProps={{ variant: 'body1', component: 'div' }}
                  />
                </ListItem>
              )}
            </List>

            {documents.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  附件
                </Typography>
                <List dense>
                  {documents.map((doc) => (
                    <ListItem
                      key={doc.id}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          aria-label="查看"
                          onClick={async () => {
                            await handleOpenFile(doc);
                          }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getFileIcon(doc.file_type, doc.file_name)}
                            <Link
                              component="button"
                              variant="body2"
                              onClick={async () => {
                                await handleOpenFile(doc);
                              }}
                              sx={{ textDecoration: 'none', cursor: 'pointer' }}
                            >
                              {doc.file_name}
                            </Link>
                          </Box>
                        }
                        secondary={doc.file_size ? formatFileSize(doc.file_size) : ''}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {application.reversal_transactions && application.reversal_transactions.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  相關銷假交易
                </Typography>
                <List>
                  {application.reversal_transactions.map((reversal) => (
                    <ListItem key={reversal.id}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label="銷假"
                              color="info"
                              size="small"
                            />
                            <Typography variant="body1" component="span">
                              交易編號：{reversal.transaction_id}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              申請人：{reversal.applicant_display_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              假期類型：{reversal.leave_type_name_zh}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              年份：{reversal.year || (reversal.start_date ? new Date(reversal.start_date).getFullYear() : '-')}年
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              日期：{formatDate(reversal.start_date)} ~ {formatDate(reversal.end_date)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              天數：{Math.abs(reversal.days)} 天
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              狀態：
                              <Chip
                                label={reversal.status === 'approved' ? '已批准' : reversal.status === 'pending' ? '待批核' : reversal.status === 'rejected' ? '已拒絕' : reversal.status}
                                color={reversal.status === 'approved' ? 'success' : reversal.status === 'pending' ? 'warning' : reversal.status === 'rejected' ? 'error' : 'default'}
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            </Typography>
                            {reversal.created_at && (
                              <Typography variant="body2" color="text.secondary">
                                創建時間：{formatDateTime(reversal.created_at)}
                              </Typography>
                            )}
                          </Box>
                        }
                        primaryTypographyProps={{ variant: 'caption' }}
                        secondaryTypographyProps={{ variant: 'body1', component: 'div' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Paper>
        </Grid>

        {canApproveThis && application.status === 'pending' && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  批核操作
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  批核階段：{displayText}
                </Typography>

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="批核意見"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {canApproveThis && (
                    <Button
                      variant={action === 'approve' ? 'contained' : 'outlined'}
                      color="success"
                      onClick={() => setAction('approve')}
                      fullWidth
                    >
                      批准
                    </Button>
                  )}
                  {canRejectThis && (
                    <Button
                      variant={action === 'reject' ? 'contained' : 'outlined'}
                      color="error"
                      onClick={() => setAction('reject')}
                      fullWidth
                    >
                      拒絕
                    </Button>
                  )}
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleSubmit}
                  disabled={approving || !action}
                  sx={{
                    opacity: !action ? 0.5 : 1,
                    cursor: !action ? 'not-allowed' : 'pointer',
                    '&:disabled': {
                      backgroundColor: 'rgba(0, 0, 0, 0.12)',
                      color: 'rgba(0, 0, 0, 0.26)'
                    }
                  }}
                >
                  {approving ? '處理中...' : !action ? '請選擇批准或拒絕' : '提交'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* HR Group 獲授權人專用拒絕操作 Grid */}
        {user?.is_hr_member && 
         application?.status === 'pending' && 
         (currentStage === 'checker' || currentStage === 'approver_1' || currentStage === 'approver_2') && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  HR Group 拒絕操作
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  當前階段：{displayText}
                </Typography>

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="拒絕原因"
                  value={hrRejectionReason}
                  onChange={(e) => setHrRejectionReason(e.target.value)}
                  placeholder="請輸入拒絕原因..."
                  sx={{ mb: 2 }}
                />

                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  onClick={handleHRReject}
                  disabled={hrRejecting}
                  sx={{
                    '&:disabled': {
                      backgroundColor: 'rgba(0, 0, 0, 0.12)',
                      color: 'rgba(0, 0, 0, 0.26)'
                    }
                  }}
                >
                  {hrRejecting ? '處理中...' : '拒絕申請'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* 文件查看 Dialog */}
      <Dialog
        open={fileDialogOpen}
        onClose={handleCloseFileDialog}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile} // 手機上全屏顯示
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {viewingFile?.file_name || '查看文件'}
            </Typography>
            <IconButton onClick={handleCloseFileDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingFile ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                載入中...
              </Typography>
            </Box>
          ) : fileBlobUrl && viewingFile ? (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {viewingFile.file_type?.startsWith('image/') ? (
                <img
                  src={fileBlobUrl}
                  alt={viewingFile.file_name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '80vh',
                    objectFit: 'contain'
                  }}
                />
              ) : viewingFile.file_type === 'application/pdf' || viewingFile.file_name?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={fileBlobUrl}
                  title={viewingFile.file_name}
                  style={{
                    width: '100%',
                    height: '80vh',
                    border: 'none'
                  }}
                />
              ) : (
                <Box sx={{ textAlign: 'center', p: 4 }}>
                  <Typography variant="body1" gutterBottom>
                    無法在瀏覽器中預覽此文件類型
                  </Typography>
                  <Button
                    variant="contained"
                    component="a"
                    href={fileBlobUrl}
                    download={viewingFile.file_name}
                    sx={{ mt: 2 }}
                  >
                    <GetAppIcon sx={{ mr: 1 }} />
                    下載文件
                  </Button>
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          {fileBlobUrl && !viewingFile?.file_type?.startsWith('image/') && viewingFile?.file_type !== 'application/pdf' && !viewingFile?.file_name?.toLowerCase().endsWith('.pdf') && (
            <Button
              component="a"
              href={fileBlobUrl}
              download={viewingFile?.file_name}
              variant="contained"
              startIcon={<GetAppIcon />}
            >
              下載
            </Button>
          )}
          <Button onClick={handleCloseFileDialog} variant="outlined">
            關閉
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalDetail;

