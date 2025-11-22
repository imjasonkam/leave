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
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  Link,
  Snackbar
} from '@mui/material';
import { 
  Visibility as VisibilityIcon, 
  Search as SearchIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  Undo as UndoIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTime, formatDate } from '../utils/dateFormat';

const ApprovalHistory = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reversalDialogOpen, setReversalDialogOpen] = useState(false);
  const [selectedReversalApplication, setSelectedReversalApplication] = useState(null);
  const [reversing, setReversing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchApprovalHistory();
  }, [statusFilter]);

  const fetchApprovalHistory = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await axios.get('/api/approvals/history', { params });
      setApplications(response.data.applications || []);
    } catch (error) {
      console.error('Fetch approval history error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusMap = {
      pending: 'warning',
      approved: 'success',
      rejected: 'error',
      cancelled: 'default'
    };
    return statusMap[status] || 'default';
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: '待批核',
      approved: '已批准',
      rejected: '已拒絕',
      cancelled: '已取消'
    };
    return statusMap[status] || status;
  };

  const getApprovalStage = (application) => {
    // 優先使用後端返回的 user_approval_stage
    if (application.user_approval_stage) {
      const stageMap = {
        checker: '待核實',
        approver_1: '首階段批核',
        approver_2: '次階段批核',
        approver_3: '最後階段批核',
        rejected: '拒絕',
        paper_flow: '紙本申請'
      };
      return stageMap[application.user_approval_stage] || '未知';
    }
    
    // 如果是 paper-flow，顯示為「紙本申請」
    if (application.is_paper_flow) {
      return '紙本申請';
    }
    
    // Fallback: 如果沒有 user_approval_stage，使用舊的邏輯檢查直接批核者
    if (application.checker_id === user.id && application.checker_at) {
      return '待核實';
    } else if (application.approver_1_id === user.id && application.approver_1_at) {
      return '首階段批核';
    } else if (application.approver_2_id === user.id && application.approver_2_at) {
      return '次階段批核';
    } else if (application.approver_3_id === user.id && application.approver_3_at) {
      return '最後階段批核';
    } else if (application.rejected_by_id === user.id) {
      return '拒絕';
    }
    return '未知';
  };

  const getApprovalDate = (application) => {
    // 如果是 paper-flow，使用創建時間（因為提交即批准）
    if (application.is_paper_flow || application.user_approval_stage === 'paper_flow') {
      return application.created_at;
    }
    
    // 優先使用 user_approval_stage 來確定日期
    if (application.user_approval_stage === 'checker' && application.checker_at) {
      return application.checker_at;
    } else if (application.user_approval_stage === 'approver_1' && application.approver_1_at) {
      return application.approver_1_at;
    } else if (application.user_approval_stage === 'approver_2' && application.approver_2_at) {
      return application.approver_2_at;
    } else if (application.user_approval_stage === 'approver_3' && application.approver_3_at) {
      return application.approver_3_at;
    } else if (application.user_approval_stage === 'rejected' && application.rejected_at) {
      return application.rejected_at;
    }
    
    // Fallback: 如果沒有 user_approval_stage，使用舊的邏輯
    if (application.checker_id === user.id && application.checker_at) {
      return application.checker_at;
    } else if (application.approver_1_id === user.id && application.approver_1_at) {
      return application.approver_1_at;
    } else if (application.approver_2_id === user.id && application.approver_2_at) {
      return application.approver_2_at;
    } else if (application.approver_3_id === user.id && application.approver_3_at) {
      return application.approver_3_at;
    } else if (application.rejected_by_id === user.id && application.rejected_at) {
      return application.rejected_at;
    }
    return null;
  };

  const filteredApplications = applications.filter(app => {
    const keyword = search.toLowerCase();
    const transactionId = app.transaction_id?.toString().toLowerCase() || '';
    const leaveTypeNameZh = app.leave_type_name_zh?.toLowerCase() || '';
    const applicantNameZh = app.applicant_name_zh?.toLowerCase() || '';
    
    return transactionId.includes(keyword) ||
           leaveTypeNameZh.includes(keyword) ||
           applicantNameZh.includes(keyword);
  });

  const isHRMember = user?.is_hr_member || user?.is_system_admin;

  const handleOpenFileDialog = async (application) => {
    setSelectedApplication(application);
    setFileDialogOpen(true);
    setError('');
    setSuccess('');
    await fetchDocuments(application.id);
  };

  const handleCloseFileDialog = () => {
    setFileDialogOpen(false);
    setSelectedApplication(null);
    setDocuments([]);
    setError('');
    setSuccess('');
  };

  const fetchDocuments = async (applicationId) => {
    try {
      const response = await axios.get(`/api/leaves/${applicationId}/documents`);
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Fetch documents error:', error);
      setError('獲取檔案列表時發生錯誤');
    }
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!selectedApplication) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      await axios.post(`/api/leaves/${selectedApplication.id}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(`成功上載 ${files.length} 個檔案`);
      await fetchDocuments(selectedApplication.id);
      event.target.value = ''; // 重置文件輸入
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || '上載檔案時發生錯誤');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('確定要刪除此檔案嗎？')) {
      return;
    }

    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      console.log(`[handleDeleteDocument] 嘗試刪除檔案，documentId: ${documentId}`);
      const response = await axios.delete(`/api/leaves/documents/${documentId}`);
      console.log(`[handleDeleteDocument] 刪除成功:`, response.data);
      setSuccess('檔案已刪除');
      await fetchDocuments(selectedApplication.id);
    } catch (error) {
      console.error('[handleDeleteDocument] 刪除錯誤:', error);
      console.error('[handleDeleteDocument] 錯誤響應:', error.response);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          '刪除檔案時發生錯誤';
      setError(errorMessage);
    } finally {
      setDeleting(false);
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

  const canManageFiles = (application) => {
    // 只有 HR Group 獲授權人且申請已批核時才能管理檔案
    return isHRMember && application.status === 'approved';
  };

  const canShowReversalButton = (application) => {
    // 只有 HR 成員可以看到銷假按鈕
    if (!isHRMember) {
      return false;
    }
    
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
    
    return true;
  };

  const handleReversalClick = (application) => {
    setSelectedReversalApplication(application);
    setReversalDialogOpen(true);
  };

  const handleReversalConfirm = async () => {
    if (!selectedReversalApplication) return;

    try {
      setReversing(true);
      const response = await axios.post('/api/leaves/reverse', {
        application_id: selectedReversalApplication.id
      });
      
      // 使用後端返回的消息
      const message = response.data.message || '銷假申請已完成';
      
      setSnackbar({
        open: true,
        message,
        severity: 'success'
      });
      
      setReversalDialogOpen(false);
      setSelectedReversalApplication(null);
      
      // 重新載入申請列表
      await fetchApprovalHistory();
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
    setSelectedReversalApplication(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        批核記錄
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, mt: 2 }}>
        <TextField
          placeholder="搜尋交易編號、申請人、假期類型..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>狀態篩選</InputLabel>
          <Select
            value={statusFilter}
            label="狀態篩選"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="approved">已批准</MenuItem>
            <MenuItem value="rejected">已拒絕</MenuItem>
            <MenuItem value="cancelled">已取消</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Paper sx={{ mt: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>交易編號</TableCell>
                <TableCell>申請人</TableCell>
                <TableCell>假期類型</TableCell>
                <TableCell>開始日期</TableCell>
                <TableCell>結束日期</TableCell>
                <TableCell>天數</TableCell>
                <TableCell>批核階段</TableCell>
                <TableCell>批核時間</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">載入中...</TableCell>
                </TableRow>
              ) : filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">沒有批核記錄</TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((app) => (
                  <React.Fragment key={app.id}>
                    <TableRow hover>
                      <TableCell>{app.transaction_id}</TableCell>
                      <TableCell>{app.applicant_name_zh}</TableCell>
                      <TableCell>{app.leave_type_name_zh}</TableCell>
                      <TableCell>{formatDate(app.start_date)}</TableCell>
                      <TableCell>{formatDate(app.end_date)}</TableCell>
                      <TableCell>{app.days}</TableCell>
                      <TableCell>
                        <Chip
                          label={getApprovalStage(app)}
                          size="small"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell>{formatDateTime(getApprovalDate(app))}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(app.status)}
                          color={getStatusColor(app.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => navigate(`/approval/${app.id}`)}
                            startIcon={<VisibilityIcon />}
                          >
                            查看詳情
                          </Button>
                          {canManageFiles(app) && (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleOpenFileDialog(app)}
                              startIcon={<AttachFileIcon />}
                            >
                              管理檔案
                            </Button>
                          )}
                          {canShowReversalButton(app) && (
                            <Button
                              variant="contained"
                              size="small"
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
                    {/* 顯示相關的 Reverse Transaction */}
                    {app.reversal_transactions && app.reversal_transactions.length > 0 && (
                      app.reversal_transactions.map((reversal) => (
                        <TableRow key={`reversal-${reversal.id}`} hover sx={{ backgroundColor: '#f8f9fa' }}>
                          <TableCell sx={{ pl: 4, position: 'relative' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                                ↳ 銷假:
                              </Typography>
                              {reversal.transaction_id}
                            </Box>
                          </TableCell>
                          <TableCell>{reversal.applicant_name_zh}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label="銷假"
                                color="info"
                                size="small"
                                sx={{ fontSize: '0.65rem', height: '20px' }}
                              />
                              <Typography variant="body2">{reversal.leave_type_name_zh}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{formatDate(reversal.start_date)}</TableCell>
                          <TableCell>{formatDate(reversal.end_date)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: 'error.main' }}>
                              -{Math.abs(reversal.days)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label="HR 銷假"
                              size="small"
                              color="info"
                            />
                          </TableCell>
                          <TableCell>{formatDateTime(reversal.created_at)}</TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusText(reversal.status)}
                              color={getStatusColor(reversal.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => navigate(`/approval/${reversal.id}`)}
                              startIcon={<VisibilityIcon />}
                            >
                              查看詳情
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 檔案管理對話框 */}
      <Dialog
        open={fileDialogOpen}
        onClose={handleCloseFileDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              管理檔案 - {selectedApplication?.transaction_id}
            </Typography>
            <IconButton onClick={handleCloseFileDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          <Box sx={{ mb: 2 }}>
            <input
              accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.tiff,.tif"
              style={{ display: 'none' }}
              id="file-upload"
              multiple
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <label htmlFor="file-upload">
              <Button
                variant="contained"
                component="span"
                startIcon={<UploadIcon />}
                disabled={uploading}
                sx={{ mb: 2 }}
              >
                {uploading ? '上載中...' : '上載檔案'}
              </Button>
            </label>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              支援格式：PDF、JPG、JPEG、PNG、GIF、BMP、WEBP、TIFF（每個檔案最大 5MB）
            </Typography>
          </Box>

          <Typography variant="h6" gutterBottom>
            檔案列表
          </Typography>
          {documents.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              目前沒有檔案
            </Typography>
          ) : (
            <List>
              {documents.map((doc) => (
                <ListItem
                  key={doc.id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="刪除"
                      onClick={() => handleDeleteDocument(doc.id)}
                      disabled={deleting}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    {getFileIcon(doc.file_type, doc.file_name)}
                    <Link
                      href={`/api/leaves/documents/${doc.id}/download?view=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ textDecoration: 'none', flex: 1 }}
                    >
                      <ListItemText
                        primary={doc.file_name}
                        secondary={doc.file_size ? formatFileSize(doc.file_size) : ''}
                      />
                    </Link>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFileDialog}>關閉</Button>
        </DialogActions>
      </Dialog>

      {/* 銷假確認對話框 */}
      <Dialog
        open={reversalDialogOpen}
        onClose={handleReversalCancel}
        aria-labelledby="reversal-dialog-title"
      >
        <DialogTitle id="reversal-dialog-title">確認銷假</DialogTitle>
        <DialogContent>
          <DialogContentText>
            您確定要對此申請進行銷假嗎？此操作將直接批准並完成銷假，無需批核流程。
            {selectedReversalApplication && (
              <>
                <br />
                <br />
                <strong>申請詳情：</strong>
                <br />
                交易編號：{selectedReversalApplication.transaction_id}
                <br />
                申請人：{selectedReversalApplication.applicant_name_zh}
                <br />
                假期類型：{selectedReversalApplication.leave_type_name_zh}
                <br />
                日期：{formatDate(selectedReversalApplication.start_date)} ~ {formatDate(selectedReversalApplication.end_date)}
                <br />
                天數：{selectedReversalApplication.days} 天
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
            {reversing ? '處理中...' : '確認銷假'}
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

export default ApprovalHistory;

