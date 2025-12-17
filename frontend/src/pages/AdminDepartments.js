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
  TextField
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const AdminDepartments = () => {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    name_zh: '',
    description: ''
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/api/admin/departments');
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Fetch departments error:', error);
    }
  };

  const handleOpen = () => {
    setEditing(null);
    setFormData({ name: '', name_zh: '', description: '' });
    setOpen(true);
  };

  const handleEdit = (dept) => {
    setEditing(dept.id);
    setFormData({
      name: dept.name,
      name_zh: dept.name_zh,
      description: dept.description || ''
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await axios.put(`/api/admin/departments/${editing}`, formData);
      } else {
        await axios.post('/api/admin/departments', formData);
      }
      setOpen(false);
      fetchDepartments();
    } catch (error) {
      alert(error.response?.data?.message || t('adminDepartments.operationFailed'));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">{t('adminDepartments.title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
          {t('adminDepartments.addDepartment')}
        </Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('adminDepartments.name')}</TableCell>
                <TableCell>{t('adminDepartments.chineseName')}</TableCell>
                <TableCell>{t('adminDepartments.description')}</TableCell>
                <TableCell>{t('adminDepartments.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell>{dept.name}</TableCell>
                  <TableCell>{dept.name_zh}</TableCell>
                  <TableCell>{dept.description || '-'}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(dept)}>
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{editing ? t('adminDepartments.editDialogTitle') : t('adminDepartments.addDialogTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
            <TextField
              label={t('adminDepartments.name')}
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextField
              label={t('adminDepartments.chineseName')}
              value={formData.name_zh}
              onChange={(e) => setFormData(prev => ({ ...prev, name_zh: e.target.value }))}
              required
            />
            <TextField
              label={t('adminDepartments.description')}
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('adminDepartments.cancel')}</Button>
          <Button onClick={handleSubmit} variant="contained">{t('adminDepartments.save')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDepartments;

