import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  TextField
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../utils/dateFormat';
import UserFormDialog from '../components/UserFormDialog';

const AdminUsers = () => {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingUserData, setEditingUserData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    const trimmedSearch = searchTerm.trim();
    const normalizedSearch = trimmedSearch.toLowerCase();
    
    if (!trimmedSearch) {
      return users;
    }

    return users.filter((u) => {
      const englishFullName = `${u.given_name || ''} ${u.surname || ''}`.trim();
      const reversedEnglishFullName = `${u.surname || ''} ${u.given_name || ''}`.trim();

      const candidates = [
        u.id?.toString() || '',
        u.employee_number || '',
        englishFullName,
        reversedEnglishFullName,
        u.surname || '',
        u.given_name || '',
        u.display_name || '',
        u.name_zh || '',
        u.alias || ''
      ];

      return candidates.some((candidate) => {
        const value = candidate.toString();
        return (
          value.toLowerCase().includes(normalizedSearch) ||
          value.includes(trimmedSearch)
        );
      });
    });
  }, [users, searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  }, []);

  const handleOpen = useCallback(() => {
    setEditing(null);
    setEditingUserData(null);
    setOpen(true);
  }, []);

  const handleEdit = useCallback((userData) => {
    setEditing(userData.id);
    setEditingUserData(userData);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setEditing(null);
    setEditingUserData(null);
  }, []);

  const handleSuccess = useCallback(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mb: 2
        }}
      >
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          {t('adminUsers.title')}
        </Typography>
        <TextField
          size="small"
          placeholder={t('adminUsers.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 260 }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
          {t('adminUsers.addUser')}
        </Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('adminUsers.employeeNumber')}</TableCell>
                <TableCell>{t('adminUsers.name')}</TableCell>
                <TableCell>{t('adminUsers.email')}</TableCell>
                <TableCell>{t('adminUsers.department')}</TableCell>
                <TableCell>{t('adminUsers.position')}</TableCell>
                <TableCell>{t('adminUsers.hireDate')}</TableCell>
                <TableCell>{t('adminUsers.accountStatus')}</TableCell>
                <TableCell>{t('adminUsers.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.employee_number}</TableCell>
                  <TableCell>{u.display_name || u.name_zh || '-'}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    {i18n.language === 'en' 
                      ? (u.department_name || u.department_name_zh || '-')
                      : (u.department_name_zh || u.department_name || '-')
                    }
                  </TableCell>
                  <TableCell>{u.position_name_zh || '-'}</TableCell>
                  <TableCell>{formatDate(u.hire_date)}</TableCell>
                  <TableCell>
                    {u.deactivated ? t('adminUsers.deactivated') : t('adminUsers.active')}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(u)}>
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <UserFormDialog
        open={open}
        editing={editing}
        initialData={editingUserData}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </Box>
  );
};

export default AdminUsers;
