import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
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
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import axios from 'axios';
import { formatDate } from '../utils/dateFormat';

const HRDocumentUpload = () => {
  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    user_id: '',
    display_name: '',
    category: '',
    visible_to_recipient: true
  });
  const [filters, setFilters] = useState({
    user_id: '',
    category: '',
    search: '',
    uploaded_by_id: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchDocuments();
    fetchUsers();
    fetchCategories();
  }, [filters]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.uploaded_by_id) params.append('uploaded_by_id', filters.uploaded_by_id);

      const response = await axios.get(`/api/documents/all?${params.toString()}`);
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Fetch documents error:', error);
      if (error.response?.status === 403) {
        setError('只有HR Group成員可以訪問此頁面');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      const usersList = response.data.users || [];
      // 按照 employee_number (username) 排序
      usersList.sort((a, b) => {
        const aUsername = a.employee_number || '';
        const bUsername = b.employee_number || '';
        return aUsername.localeCompare(bUsername, undefined, { numeric: true, sensitivity: 'base' });
      });
      setUsers(usersList);
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/documents/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Fetch categories error:', error);
    }
  };

  const handleOpen = () => {
    setEditingDoc(null);
    setSelectedFile(null);
    setFormData({
      user_id: '',
      display_name: '',
      category: '',
      visible_to_recipient: true
    });
    setError('');
    setSuccess('');
    setOpen(true);
  };

  const handleEdit = (doc) => {
    setEditingDoc(doc);
      setFormData({
        user_id: doc.user_id,
        display_name: doc.display_name,
        category: doc.category || '',
        visible_to_recipient: doc.visible_to_recipient
      });
    setError('');
    setSuccess('');
    setEditOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 檢查文件大小（8MB）
      if (file.size > 8 * 1024 * 1024) {
        setError('文件大小不能超過8MB');
        e.target.value = '';
        return;
      }
      
      // 檢查文件類型
      const allowedTypes = ['pdf', 'jpeg', 'jpg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif'];
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!allowedTypes.includes(fileExt)) {
        setError(`不支援的檔案類型。只允許：${allowedTypes.join(', ')}`);
        e.target.value = '';
        return;
      }

      setSelectedFile(file);
      if (!formData.display_name) {
        setFormData(prev => ({ ...prev, display_name: file.name.replace(/\.[^/.]+$/, '') }));
      }
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('請選擇要上傳的文件');
      return;
    }

    if (!formData.user_id) {
      setError('請選擇接收文件的員工');
      return;
    }

    if (!formData.display_name || formData.display_name.trim() === '') {
      setError('請輸入文件顯示名稱');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('user_id', formData.user_id);
      uploadFormData.append('display_name', formData.display_name.trim());
      if (formData.category) {
        uploadFormData.append('category', formData.category.trim());
      }
      uploadFormData.append('visible_to_recipient', formData.visible_to_recipient);

      await axios.post('/api/documents/upload', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('文件上傳成功');
      setOpen(false);
      setSelectedFile(null);
      setFormData({
        user_id: '',
        display_name: '',
        category: '',
        visible_to_recipient: true
      });
      fetchDocuments();
      fetchCategories();
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || '上傳文件時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!formData.display_name || formData.display_name.trim() === '') {
      setError('請輸入文件顯示名稱');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await axios.put(`/api/documents/${editingDoc.id}`, {
        display_name: formData.display_name.trim(),
        category: formData.category ? formData.category.trim() : null,
        visible_to_recipient: formData.visible_to_recipient
      });

      setSuccess('文件信息更新成功');
      setEditOpen(false);
      fetchDocuments();
      fetchCategories();
    } catch (error) {
      console.error('Update error:', error);
      setError(error.response?.data?.message || '更新文件信息時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('確定要刪除此文件嗎？')) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`/api/documents/${docId}`);
      setSuccess('文件已刪除');
      fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.response?.data?.message || '刪除文件時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (docId, displayName, fileName) => {
    try {
      const response = await axios.get(`/api/documents/${docId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${displayName}${fileName.substring(fileName.lastIndexOf('.'))}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download error:', error);
      setError(error.response?.data?.message || '下載文件時發生錯誤');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc => {
    if (filters.user_id && doc.user_id !== parseInt(filters.user_id)) return false;
    if (filters.category && doc.category !== filters.category) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        doc.display_name?.toLowerCase().includes(searchLower) ||
        doc.recipient_display_name?.toLowerCase().includes(searchLower) ||
        doc.recipient_employee_number?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">文件發放管理</Typography>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={handleOpen}
        >
          上傳文件
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>接收員工</InputLabel>
            <Select
              value={filters.user_id}
              label="接收員工"
              onChange={(e) => setFilters(prev => ({ ...prev, user_id: e.target.value }))}
            >
              <MenuItem value="">全部</MenuItem>
              {users.map(user => (
                <MenuItem key={user.id} value={user.id}>
                  {user.employee_number} ({user.display_name || `${user.surname} ${user.given_name}`})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>文件類別</InputLabel>
            <Select
              value={filters.category}
              label="文件類別"
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            >
              <MenuItem value="">全部</MenuItem>
              {categories.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>


          <TextField
            label="搜尋"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="文件名稱、員工姓名或工號"
            sx={{ minWidth: 250 }}
          />
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>文件名稱</TableCell>
              <TableCell>接收員工</TableCell>
              <TableCell>類別</TableCell>
              <TableCell>文件大小</TableCell>
              <TableCell>上傳者</TableCell>
              <TableCell>上傳時間</TableCell>
              <TableCell>可見性</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  沒有文件
                </TableCell>
              </TableRow>
            ) : (
              filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{doc.display_name}</TableCell>
                  <TableCell>
                    {doc.recipient_display_name || `${doc.recipient_surname} ${doc.recipient_given_name}`}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {doc.recipient_employee_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {doc.category ? <Chip label={doc.category} size="small" /> : '-'}
                  </TableCell>
                  <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                  <TableCell>{doc.uploader_display_name || doc.uploader_email}</TableCell>
                  <TableCell>{formatDate(doc.created_at)}</TableCell>
                  <TableCell>
                    {doc.visible_to_recipient ? (
                      <Chip label="對員工可見" size="small" color="success" />
                    ) : (
                      <Chip label="對員工隱藏" size="small" color="default" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(doc.id, doc.display_name, doc.file_name)}
                      title="下載"
                    >
                      <DownloadIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(doc)}
                      title="編輯"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(doc.id)}
                      title="刪除"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 上傳對話框 */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>上傳文件</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>接收員工 *</InputLabel>
              <Select
                value={formData.user_id}
                label="接收員工 *"
                onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
              >
                {users.map(user => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.employee_number} ({user.display_name || `${user.surname} ${user.given_name}`})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="文件顯示名稱 *"
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              fullWidth
              helperText="員工下載時顯示的名稱"
            />

            <FormControl fullWidth>
              <InputLabel>文件類別</InputLabel>
              <Select
                value={formData.category}
                label="文件類別"
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                <MenuItem value="">無類別</MenuItem>
                <MenuItem value="Salary Advice">Salary Advice</MenuItem>
                <MenuItem value="IR56B">IR56B</MenuItem>
                <MenuItem value="IR56F">IR56F</MenuItem>
                <MenuItem value="IR56G">IR56G</MenuItem>
                <MenuItem value="Work Proof">Work Proof</MenuItem>
                <MenuItem value="Service Letter">Service Letter</MenuItem>
                <MenuItem value="Others">Others</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              fullWidth
              sx={{ py: 1.5 }}
            >
              {selectedFile ? selectedFile.name : '選擇文件 (PDF、JPEG、TIFF等，最大8MB)'}
              <input
                type="file"
                hidden
                accept=".pdf,.jpeg,.jpg,.png,.gif,.bmp,.webp,.tiff,.tif"
                onChange={handleFileChange}
              />
            </Button>

            {selectedFile && (
              <Typography variant="body2" color="text.secondary">
                文件大小: {formatFileSize(selectedFile.size)}
              </Typography>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={formData.visible_to_recipient}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, visible_to_recipient: e.target.checked }))
                  }
                />
              }
              label="開放給員工"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={loading || !selectedFile || !formData.user_id || !formData.display_name}
          >
            {loading ? <CircularProgress size={20} /> : '上傳'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 編輯對話框 */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>編輯文件信息</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="文件顯示名稱 *"
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>文件類別</InputLabel>
              <Select
                value={formData.category}
                label="文件類別"
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                <MenuItem value="">無類別</MenuItem>
                <MenuItem value="Salary Advice">Salary Advice</MenuItem>
                <MenuItem value="IR56B">IR56B</MenuItem>
                <MenuItem value="IR56F">IR56F</MenuItem>
                <MenuItem value="IR56G">IR56G</MenuItem>
                <MenuItem value="Work Proof">Work Proof</MenuItem>
                <MenuItem value="Service Letter">Service Letter</MenuItem>
                <MenuItem value="Others">Others</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.visible_to_recipient}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, visible_to_recipient: e.target.checked }))
                  }
                />
              }
              label="開放給員工"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>取消</Button>
          <Button
            onClick={handleUpdate}
            variant="contained"
            disabled={loading || !formData.display_name}
          >
            {loading ? <CircularProgress size={20} /> : '儲存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HRDocumentUpload;

