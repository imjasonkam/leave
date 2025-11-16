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
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  Link
} from '@mui/material';
import { 
  Visibility as VisibilityIcon, 
  Search as SearchIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  Close as CloseIcon
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
    // 如果是 paper-flow，顯示為「HR 提交」
    if (application.is_paper_flow) {
      return '紙本申請';
    }
    
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
    if (application.is_paper_flow) {
      return application.created_at;
    }
    
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
                  <TableRow key={app.id} hover>
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
                      <Box sx={{ display: 'flex', gap: 1 }}>
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
                      </Box>
                    </TableCell>
                  </TableRow>
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
              支援格式：PDF、JPG、JPEG、PNG、GIF、BMP、WEBP、TIFF（每個檔案最大 10MB）
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
    </Box>
  );
};

export default ApprovalHistory;

