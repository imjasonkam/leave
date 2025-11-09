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
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Group as GroupIcon 
} from '@mui/icons-material';
import axios from 'axios';

const AdminGroups = () => {
  const [tabValue, setTabValue] = useState(0);
  const [departmentGroups, setDepartmentGroups] = useState([]);
  const [delegationGroups, setDelegationGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedGroupType, setSelectedGroupType] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    name_zh: '',
    description: '',
    checker_id: '',
    approver_1_id: '',
    approver_2_id: '',
    approver_3_id: ''
  });

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const fetchGroups = async () => {
    try {
      const [deptResponse, delegResponse] = await Promise.all([
        axios.get('/api/groups/department'),
        axios.get('/api/groups/delegation')
      ]);
      setDepartmentGroups(deptResponse.data.groups || []);
      setDelegationGroups(delegResponse.data.groups || []);
    } catch (error) {
      console.error('Fetch groups error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  const handleOpen = (type) => {
    setEditing(null);
    setSelectedGroupType(type);
    if (type === 'department') {
      setFormData({ 
        name: '', 
        name_zh: '', 
        description: '',
        checker_id: '',
        approver_1_id: '',
        approver_2_id: '',
        approver_3_id: ''
      });
    } else {
      setFormData({ 
        name: '', 
        name_zh: '', 
        description: ''
      });
    }
    setOpen(true);
  };

  const handleEdit = (group, type) => {
    setEditing(group.id);
    setSelectedGroupType(type);
    if (type === 'department') {
      setFormData({
        name: group.name,
        name_zh: group.name_zh,
        description: group.description || '',
        checker_id: group.checker_id || '',
        approver_1_id: group.approver_1_id || '',
        approver_2_id: group.approver_2_id || '',
        approver_3_id: group.approver_3_id || ''
      });
    } else {
      setFormData({
        name: group.name,
        name_zh: group.name_zh,
        description: group.description || ''
      });
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const endpoint = selectedGroupType === 'department' ? '/api/groups/department' : '/api/groups/delegation';
      if (editing) {
        await axios.put(`${endpoint}/${editing}`, formData);
      } else {
        await axios.post(endpoint, formData);
      }
      setOpen(false);
      fetchGroups();
    } catch (error) {
      alert(error.response?.data?.message || '操作失敗');
    }
  };

  const handleDeleteGroup = async (groupId, type) => {
    const confirmed = window.confirm('確定要刪除此群組？');
    if (!confirmed) {
      return;
    }

    try {
      const endpoint = type === 'department' ? '/api/groups/department' : '/api/groups/delegation';
      await axios.delete(`${endpoint}/${groupId}`);
      fetchGroups();
    } catch (error) {
      alert(error.response?.data?.message || '刪除群組失敗');
    }
  };

  const handleOpenMembers = async (group, type) => {
    setSelectedGroup(group);
    setSelectedGroupType(type);
    try {
      const endpoint = type === 'department' ? '/api/groups/department' : '/api/groups/delegation';
      const response = await axios.get(`${endpoint}/${group.id}/members`);
      setGroupMembers(response.data.members || []);
      setMembersDialogOpen(true);
    } catch (error) {
      console.error('Fetch members error:', error);
      const message = error.response?.data?.message || error.message || '無法載入成員列表';
      alert(message);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      const endpoint = selectedGroupType === 'department' ? '/api/groups/department' : '/api/groups/delegation';
      await axios.post(`${endpoint}/${selectedGroup.id}/members`, { user_id: userId });
      handleOpenMembers(selectedGroup, selectedGroupType);
      fetchGroups();
    } catch (error) {
      alert(error.response?.data?.message || '新增成員失敗');
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      const endpoint = selectedGroupType === 'department' ? '/api/groups/department' : '/api/groups/delegation';
      await axios.delete(`${endpoint}/${selectedGroup.id}/members/${userId}`);
      handleOpenMembers(selectedGroup, selectedGroupType);
      fetchGroups();
    } catch (error) {
      alert(error.response?.data?.message || '移除成員失敗');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">群組管理</Typography>
      </Box>

      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="部門群組" />
        <Tab label="授權群組" />
      </Tabs>

      {tabValue === 0 && (
        <Box>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => handleOpen('department')}
            sx={{ mb: 2 }}
          >
            新增部門群組
          </Button>
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>名稱</TableCell>
                    <TableCell>中文名稱</TableCell>
                    <TableCell>檢查群組</TableCell>
                    <TableCell>第一批核群組</TableCell>
                    <TableCell>第二批核群組</TableCell>
                    <TableCell>第三批核群組</TableCell>
                    <TableCell>成員數</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {departmentGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>{group.name}</TableCell>
                      <TableCell>{group.name_zh}</TableCell>
                      <TableCell>{group.checker_name_zh || '-'}</TableCell>
                      <TableCell>{group.approver_1_name_zh || '-'}</TableCell>
                      <TableCell>{group.approver_2_name_zh || '-'}</TableCell>
                      <TableCell>{group.approver_3_name_zh || '-'}</TableCell>
                      <TableCell>{group.user_ids?.length || 0}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleEdit(group, 'department')}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleOpenMembers(group, 'department')}>
                          <GroupIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteGroup(group.id, 'department')}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => handleOpen('delegation')}
            sx={{ mb: 2 }}
          >
            新增授權群組
          </Button>
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>名稱</TableCell>
                    <TableCell>中文名稱</TableCell>
                    <TableCell>描述</TableCell>
                    <TableCell>成員數</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {delegationGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>{group.name}</TableCell>
                      <TableCell>{group.name_zh}</TableCell>
                      <TableCell>{group.description || '-'}</TableCell>
                      <TableCell>{group.user_ids?.length || 0}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleEdit(group, 'delegation')}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleOpenMembers(group, 'delegation')}>
                          <GroupIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteGroup(group.id, 'delegation')}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editing ? '編輯' : '新增'}
          {selectedGroupType === 'department' ? '部門群組' : '授權群組'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
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
            <TextField
              label="描述"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
            {selectedGroupType === 'department' && (
              <>
                <FormControl>
                  <InputLabel>檢查群組</InputLabel>
                  <Select
                    value={formData.checker_id}
                    label="檢查群組"
                    onChange={(e) => setFormData(prev => ({ ...prev, checker_id: e.target.value }))}
                  >
                    <MenuItem value="">無</MenuItem>
                    {delegationGroups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name_zh}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <InputLabel>第一批核群組</InputLabel>
                  <Select
                    value={formData.approver_1_id}
                    label="第一批核群組"
                    onChange={(e) => setFormData(prev => ({ ...prev, approver_1_id: e.target.value }))}
                  >
                    <MenuItem value="">無</MenuItem>
                    {delegationGroups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name_zh}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <InputLabel>第二批核群組</InputLabel>
                  <Select
                    value={formData.approver_2_id}
                    label="第二批核群組"
                    onChange={(e) => setFormData(prev => ({ ...prev, approver_2_id: e.target.value }))}
                  >
                    <MenuItem value="">無</MenuItem>
                    {delegationGroups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name_zh}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <InputLabel>第三批核群組</InputLabel>
                  <Select
                    value={formData.approver_3_id}
                    label="第三批核群組"
                    onChange={(e) => setFormData(prev => ({ ...prev, approver_3_id: e.target.value }))}
                  >
                    <MenuItem value="">無</MenuItem>
                    {delegationGroups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name_zh}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} variant="contained">儲存</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={membersDialogOpen} onClose={() => setMembersDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          群組成員 - {selectedGroup?.name_zh}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>新增成員</Typography>
            <FormControl fullWidth>
              <InputLabel>選擇使用者</InputLabel>
              <Select
                label="選擇使用者"
                onChange={(e) => handleAddMember(e.target.value)}
                value=""
              >
                {users.filter(u => !groupMembers.find(m => m.id === u.id)).map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name_zh} ({user.employee_number})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>當前成員</Typography>
          <List>
            {groupMembers.map((member) => (
              <ListItem key={member.id}>
                <ListItemText
                  primary={`${member.name_zh} (${member.employee_number})`}
                  secondary={member.department_name_zh}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleRemoveMember(member.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMembersDialogOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminGroups;
