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
  Button
} from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ApprovalList = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/approvals/pending');
      setApplications(response.data.applications || []);
    } catch (error) {
      console.error('Fetch pending approvals error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStage = (application) => {
    if (!application.checker_at && application.checker_id) return 'checker';
    if (!application.approver_1_at && application.approver_1_id) return 'approver_1';
    if (!application.approver_2_at && application.approver_2_id) return 'approver_2';
    if (!application.approver_3_at && application.approver_3_id) return 'approver_3';
    return 'completed';
  };

  const canApprove = (application) => {
    const stage = getCurrentStage(application);
    if (stage === 'checker' && application.checker_id === user.id) return true;
    if (stage === 'approver_1' && application.approver_1_id === user.id) return true;
    if (stage === 'approver_2' && application.approver_2_id === user.id) return true;
    if (stage === 'approver_3' && application.approver_3_id === user.id) return true;
    return false;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        待批核申請
      </Typography>

      <Paper sx={{ mt: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>交易編號</TableCell>
                <TableCell>申請人</TableCell>
                <TableCell>假期類型</TableCell>
                <TableCell>日期</TableCell>
                <TableCell>天數</TableCell>
                <TableCell>當前階段</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">載入中...</TableCell>
                </TableRow>
              ) : applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">沒有待批核申請</TableCell>
                </TableRow>
              ) : (
                applications.map((app) => {
                  const stage = getCurrentStage(app);
                  const canApproveThis = canApprove(app);
                  
                  return (
                    <TableRow key={app.id} hover>
                      <TableCell>{app.transaction_id}</TableCell>
                      <TableCell>{app.applicant_name_zh}</TableCell>
                      <TableCell>{app.leave_type_name_zh}</TableCell>
                      <TableCell>
                        {app.start_date} ~ {app.end_date}
                      </TableCell>
                      <TableCell>{app.days}</TableCell>
                      <TableCell>
                        <Chip
                          label={stage === 'checker' ? '檢查' : stage === 'approver_1' ? '第一批核' : stage === 'approver_2' ? '第二批核' : stage === 'approver_3' ? '第三批核' : '已完成'}
                          color={canApproveThis ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => navigate(`/approval/${app.id}`)}
                          startIcon={<VisibilityIcon />}
                        >
                          查看詳情
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ApprovalList;

