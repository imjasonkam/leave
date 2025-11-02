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
  FormControlLabel,
  Switch
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';

const AdminLeaveTypes = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_zh: '',
    requires_balance: true,
    is_active: true
  });

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      const response = await axios.get('/api/admin/leave-types');
      setLeaveTypes(response.data.leaveTypes || []);
    } catch (error) {
      console.error('Fetch leave types error:', error);
    }
  };

  const handleOpen = () => {
    setEditing(null);
    setFormData({
      code: '',
      name: '',
      name_zh: '',
      requires_balance: true,
      is_active: true
    });
    setOpen(true);
  };

  const handleEdit = (leaveType) => {
    setEditing(leaveType.id);
    setFormData({
      code: leaveType.code,
      name: leaveType.name,
      name_zh: leaveType.name_zh,
      requires_balance: leaveType.requires_balance,
      is_active: leaveType.is_active !== undefined ? leaveType.is_active : true
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await axios.put(`/api/admin/leave-types/${editing}`, formData);
      } else {
        await axios.post('/api/admin/leave-types', formData);
      }
      setOpen(false);
      fetchLeaveTypes();
    } catch (error) {
      alert(error.response?.data?.message || '操作失敗');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">假期類型管理</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
          新增假期類型
        </Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>代碼</TableCell>
                <TableCell>名稱</TableCell>
                <TableCell>中文名稱</TableCell>
                <TableCell>需餘額限制</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaveTypes.map((lt) => (
                <TableRow key={lt.id}>
                  <TableCell>{lt.code}</TableCell>
                  <TableCell>{lt.name}</TableCell>
                  <TableCell>{lt.name_zh}</TableCell>
                  <TableCell>{lt.requires_balance ? '是' : '否'}</TableCell>
                  <TableCell>{lt.is_active ? '啟用' : '停用'}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(lt)}>
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
        <DialogTitle>{editing ? '編輯假期類型' : '新增假期類型'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
            <TextField
              label="代碼"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
              required
              disabled={!!editing}
            />
            <TextField
              label="名稱"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextField
              label="中文名稱"
              value={formData.name_zh}
              onChange={(e) => setFormData(prev => ({ ...prev, name_zh: e.target.value }))}
              required
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.requires_balance}
                  onChange={(e) => setFormData(prev => ({ ...prev, requires_balance: e.target.checked }))}
                />
              }
              label="需餘額限制"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                />
              }
              label="啟用"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} variant="contained">儲存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminLeaveTypes;

