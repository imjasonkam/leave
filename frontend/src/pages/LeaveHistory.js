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
  InputAdornment
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LeaveHistory = () => {
  const { user, isSystemAdmin, isDeptHead } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (!isSystemAdmin && !isDeptHead) {
        params.applicant_id = user.id;
      }

      const response = await axios.get('/api/leaves', { params });
      setApplications(response.data.applications || []);
    } catch (error) {
      console.error('Fetch applications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusMap = {
      pending: 'warning',
      approved: 'success',
      rejected: 'error'
    };
    return statusMap[status] || 'default';
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: '待批核',
      approved: '已批准',
      rejected: '已拒絕'
    };
    return statusMap[status] || status;
  };

  const filteredApplications = applications.filter(app => 
    app.transaction_id?.toLowerCase().includes(search.toLowerCase()) ||
    app.leave_type_name_zh?.toLowerCase().includes(search.toLowerCase()) ||
    app.applicant_name_zh?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        申請歷史
      </Typography>

      <Paper sx={{ mt: 2, p: 2 }}>
        <TextField
          fullWidth
          placeholder="搜尋交易編號、假期類型或申請人..."
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
                <TableCell>交易編號</TableCell>
                <TableCell>申請人</TableCell>
                <TableCell>假期類型</TableCell>
                <TableCell>開始日期</TableCell>
                <TableCell>結束日期</TableCell>
                <TableCell>天數</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">載入中...</TableCell>
                </TableRow>
              ) : filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">沒有申請記錄</TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((app) => (
                  <TableRow key={app.id} hover>
                    <TableCell>{app.transaction_id}</TableCell>
                    <TableCell>{app.applicant_name_zh}</TableCell>
                    <TableCell>{app.leave_type_name_zh}</TableCell>
                    <TableCell>{app.start_date}</TableCell>
                    <TableCell>{app.end_date}</TableCell>
                    <TableCell>{app.days}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(app.status)}
                        color={getStatusColor(app.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/approval/${app.id}`)}
                      >
                        查看詳情
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default LeaveHistory;

