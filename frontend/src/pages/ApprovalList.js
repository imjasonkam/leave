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
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/dateFormat';

const ApprovalList = () => {
  const { t } = useTranslation();
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
    // 優先使用後端返回的 current_approval_stage
    if (application.current_approval_stage) {
      return application.current_approval_stage;
    }
    // Fallback: 如果沒有 current_approval_stage，使用舊的邏輯
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

  const getStageText = (stage) => {
    const stageMap = {
      checker: t('approvalList.stageChecker'),
      approver_1: t('approvalList.stageApprover1'),
      approver_2: t('approvalList.stageApprover2'),
      approver_3: t('approvalList.stageApprover3'),
      completed: t('approvalList.stageCompleted')
    };
    return stageMap[stage] || stage;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t('approvalList.title')}
      </Typography>

      <Paper sx={{ mt: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('approvalList.transactionId')}</TableCell>
                <TableCell>{t('approvalList.applicant')}</TableCell>
                <TableCell>{t('approvalList.leaveType')}</TableCell>
                <TableCell>{t('approvalList.year')}</TableCell>
                <TableCell>{t('approvalList.date')}</TableCell>
                <TableCell>{t('approvalList.days')}</TableCell>
                <TableCell>{t('approvalList.currentStage')}</TableCell>
                <TableCell>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">{t('common.loading')}</TableCell>
                </TableRow>
              ) : applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">{t('approvalList.noPendingApplications')}</TableCell>
                </TableRow>
              ) : (
                applications.map((app) => {
                  const stage = getCurrentStage(app);
                  const canApproveThis = canApprove(app);
                  
                  return (
                    <TableRow key={app.id} hover>
                      <TableCell>{app.transaction_id}</TableCell>
                      <TableCell>{app.applicant_display_name}</TableCell>
                      <TableCell>{app.leave_type_name_zh}</TableCell>
                      <TableCell>
                        {app.year || (app.start_date ? new Date(app.start_date).getFullYear() : '-')}{t('approvalList.yearSuffix')}
                      </TableCell>
                      <TableCell>
                        {formatDate(app.start_date)} ~ {formatDate(app.end_date)}
                      </TableCell>
                      <TableCell>{app.days}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStageText(stage)}
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
                          {t('approvalList.viewDetails')}
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

