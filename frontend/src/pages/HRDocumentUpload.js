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
import { useTranslation } from 'react-i18next';
import { formatDate } from '../utils/dateFormat';

const HRDocumentUpload = () => {
  const { t } = useTranslation();
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
        setError(t('hrDocumentUpload.onlyHRGroup'));
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
        setError(t('hrDocumentUpload.fileSizeExceeded'));
        e.target.value = '';
        return;
      }
      
      // 檢查文件類型
      const allowedTypes = ['pdf', 'jpeg', 'jpg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif'];
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!allowedTypes.includes(fileExt)) {
        setError(t('hrDocumentUpload.unsupportedFileType', { types: allowedTypes.join(', ') }));
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
      setError(t('hrDocumentUpload.pleaseSelectFile'));
      return;
    }

    if (!formData.user_id) {
      setError(t('hrDocumentUpload.pleaseSelectEmployee'));
      return;
    }

    if (!formData.display_name || formData.display_name.trim() === '') {
      setError(t('hrDocumentUpload.pleaseEnterDisplayName'));
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

      setSuccess(t('hrDocumentUpload.uploadSuccess'));
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
      setError(error.response?.data?.message || t('hrDocumentUpload.uploadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!formData.display_name || formData.display_name.trim() === '') {
      setError(t('hrDocumentUpload.pleaseEnterDisplayName'));
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

      setSuccess(t('hrDocumentUpload.updateSuccess'));
      setEditOpen(false);
      fetchDocuments();
      fetchCategories();
    } catch (error) {
      console.error('Update error:', error);
      setError(error.response?.data?.message || t('hrDocumentUpload.updateError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm(t('hrDocumentUpload.confirmDelete'))) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`/api/documents/${docId}`);
      setSuccess(t('hrDocumentUpload.deleteSuccess'));
      fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.response?.data?.message || t('hrDocumentUpload.deleteError'));
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
      setError(error.response?.data?.message || t('hrDocumentUpload.downloadError'));
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
        <Typography variant="h4">{t('hrDocumentUpload.title')}</Typography>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={handleOpen}
        >
          {t('hrDocumentUpload.uploadFile')}
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
            <InputLabel>{t('hrDocumentUpload.recipientEmployee')}</InputLabel>
            <Select
              value={filters.user_id}
              label={t('hrDocumentUpload.recipientEmployee')}
              onChange={(e) => setFilters(prev => ({ ...prev, user_id: e.target.value }))}
            >
              <MenuItem value="">{t('hrDocumentUpload.all')}</MenuItem>
              {users.map(user => (
                <MenuItem key={user.id} value={user.id}>
                  {user.employee_number} ({user.display_name || `${user.surname} ${user.given_name}`})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>{t('hrDocumentUpload.documentCategory')}</InputLabel>
            <Select
              value={filters.category}
              label={t('hrDocumentUpload.documentCategory')}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            >
              <MenuItem value="">{t('hrDocumentUpload.all')}</MenuItem>
              {categories.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>


          <TextField
            label={t('hrDocumentUpload.search')}
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder={t('hrDocumentUpload.searchPlaceholder')}
            sx={{ minWidth: 250 }}
          />
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('hrDocumentUpload.fileName')}</TableCell>
              <TableCell>{t('hrDocumentUpload.recipientEmployee')}</TableCell>
              <TableCell>{t('hrDocumentUpload.category')}</TableCell>
              <TableCell>{t('hrDocumentUpload.fileSize')}</TableCell>
              <TableCell>{t('hrDocumentUpload.uploader')}</TableCell>
              <TableCell>{t('hrDocumentUpload.uploadTime')}</TableCell>
              <TableCell>{t('hrDocumentUpload.visibility')}</TableCell>
              <TableCell align="right">{t('hrDocumentUpload.actions')}</TableCell>
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
                  {t('hrDocumentUpload.noDocuments')}
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
                      <Chip label={t('hrDocumentUpload.visibleToEmployee')} size="small" color="success" />
                    ) : (
                      <Chip label={t('hrDocumentUpload.hiddenFromEmployee')} size="small" color="default" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(doc.id, doc.display_name, doc.file_name)}
                      title={t('hrDocumentUpload.download')}
                    >
                      <DownloadIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(doc)}
                      title={t('hrDocumentUpload.edit')}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(doc.id)}
                      title={t('hrDocumentUpload.delete')}
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
        <DialogTitle>{t('hrDocumentUpload.uploadDialogTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>{t('hrDocumentUpload.recipientEmployeeRequired')}</InputLabel>
              <Select
                value={formData.user_id}
                label={t('hrDocumentUpload.recipientEmployeeRequired')}
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
              label={t('hrDocumentUpload.fileDisplayName')}
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              fullWidth
              helperText={t('hrDocumentUpload.fileDisplayNameHelper')}
            />

            <FormControl fullWidth>
              <InputLabel>{t('hrDocumentUpload.documentCategoryLabel')}</InputLabel>
              <Select
                value={formData.category}
                label={t('hrDocumentUpload.documentCategoryLabel')}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                <MenuItem value="">{t('hrDocumentUpload.noCategory')}</MenuItem>
                <MenuItem value="Salary Advice">Salary Advice</MenuItem>
                <MenuItem value="IR56B">IR56B</MenuItem>
                <MenuItem value="IR56F">IR56F</MenuItem>
                <MenuItem value="IR56G">IR56G</MenuItem>
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
              {selectedFile ? selectedFile.name : t('hrDocumentUpload.selectFile')}
              <input
                type="file"
                hidden
                accept=".pdf,.jpeg,.jpg,.png,.gif,.bmp,.webp,.tiff,.tif"
                onChange={handleFileChange}
              />
            </Button>

            {selectedFile && (
              <Typography variant="body2" color="text.secondary">
                {t('hrDocumentUpload.fileSizeLabel')}: {formatFileSize(selectedFile.size)}
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
              label={t('hrDocumentUpload.openToEmployee')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('hrDocumentUpload.cancel')}</Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={loading || !selectedFile || !formData.user_id || !formData.display_name}
          >
            {loading ? <CircularProgress size={20} /> : t('hrDocumentUpload.upload')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 編輯對話框 */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('hrDocumentUpload.editDialogTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label={t('hrDocumentUpload.fileDisplayName')}
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>{t('hrDocumentUpload.documentCategoryLabel')}</InputLabel>
              <Select
                value={formData.category}
                label={t('hrDocumentUpload.documentCategoryLabel')}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                <MenuItem value="">{t('hrDocumentUpload.noCategory')}</MenuItem>
                <MenuItem value="Salary Advice">Salary Advice</MenuItem>
                <MenuItem value="IR56B">IR56B</MenuItem>
                <MenuItem value="IR56F">IR56F</MenuItem>
                <MenuItem value="IR56G">IR56G</MenuItem>
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
              label={t('hrDocumentUpload.openToEmployee')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>{t('hrDocumentUpload.cancel')}</Button>
          <Button
            onClick={handleUpdate}
            variant="contained"
            disabled={loading || !formData.display_name}
          >
            {loading ? <CircularProgress size={20} /> : t('hrDocumentUpload.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HRDocumentUpload;

