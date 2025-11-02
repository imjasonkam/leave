import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Chip,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const ApprovalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [comment, setComment] = useState('');
  const [action, setAction] = useState('approve');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/leaves/${id}`);
      setApplication(response.data.application);
    } catch (error) {
      console.error('Fetch application error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStage = (app) => {
    if (!app.checked_at) return { stage: 'checker', text: '檢查' };
    if (!app.approved_1_at) return { stage: 'approver_1', text: '第一批核' };
    if (!app.approved_2_at) return { stage: 'approver_2', text: '第二批核' };
    if (!app.approved_3_at) return { stage: 'approver_3', text: '第三批核' };
    return { stage: 'completed', text: '已完成' };
  };

  const canApprove = (app) => {
    if (!app) return false;
    const { stage } = getCurrentStage(app);
    if (stage === 'checker' && app.checker_id === user.id) return true;
    if (stage === 'approver_1' && app.approver_1_id === user.id) return true;
    if (stage === 'approver_2' && app.approver_2_id === user.id) return true;
    if (stage === 'approver_3' && app.approver_3_id === user.id) return true;
    return false;
  };

  const handleSubmit = async () => {
    if (!application) return;

    setError('');
    setSuccess('');
    setApproving(true);

    try {
      const { stage } = getCurrentStage(application);
      await axios.post(`/api/approvals/${id}/approve`, {
        action,
        stage,
        comment
      });

      setSuccess(action === 'approve' ? '批核成功' : '已拒絕');
      setTimeout(() => {
        navigate('/approval/list');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || '操作失敗');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return <Box>載入中...</Box>;
  }

  if (!application) {
    return <Box>申請不存在</Box>;
  }

  const { stage, text } = getCurrentStage(application);
  const canApproveThis = canApprove(application);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        申請詳情
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              申請資訊
            </Typography>

            <List>
              <ListItem>
                <ListItemText primary="交易編號" secondary={application.transaction_id} />
              </ListItem>
              <ListItem>
                <ListItemText primary="申請人" secondary={application.applicant_name_zh} />
              </ListItem>
              <ListItem>
                <ListItemText primary="假期類型" secondary={application.leave_type_name_zh} />
              </ListItem>
              <ListItem>
                <ListItemText primary="開始日期" secondary={application.start_date} />
              </ListItem>
              <ListItem>
                <ListItemText primary="結束日期" secondary={application.end_date} />
              </ListItem>
              <ListItem>
                <ListItemText primary="天數" secondary={application.days} />
              </ListItem>
              <ListItem>
                <ListItemText primary="狀態" secondary={
                  <Chip
                    label={application.status === 'pending' ? '待批核' : application.status === 'approved' ? '已批准' : '已拒絕'}
                    color={application.status === 'pending' ? 'warning' : application.status === 'approved' ? 'success' : 'error'}
                    size="small"
                  />
                } />
              </ListItem>
              {application.reason && (
                <ListItem>
                  <ListItemText primary="原因" secondary={application.reason} />
                </ListItem>
              )}
            </List>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              批核流程
            </Typography>

            <List>
              <ListItem>
                <ListItemText
                  primary="檢查"
                  secondary={application.checked_at ? `已檢查於 ${application.checked_at}` : '待檢查'}
                />
                {application.checker_comment && (
                  <Typography variant="body2" color="text.secondary">
                    {application.checker_comment}
                  </Typography>
                )}
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="第一批核"
                  secondary={application.approved_1_at ? `已批核於 ${application.approved_1_at}` : '待批核'}
                />
                {application.approver_1_comment && (
                  <Typography variant="body2" color="text.secondary">
                    {application.approver_1_comment}
                  </Typography>
                )}
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="第二批核"
                  secondary={application.approved_2_at ? `已批核於 ${application.approved_2_at}` : application.approved_1_at ? '待批核' : '未開始'}
                />
                {application.approver_2_comment && (
                  <Typography variant="body2" color="text.secondary">
                    {application.approver_2_comment}
                  </Typography>
                )}
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="第三批核 (HR)"
                  secondary={application.approved_3_at ? `已批核於 ${application.approved_3_at}` : application.approved_2_at ? '待批核' : '未開始'}
                />
                {application.approver_3_comment && (
                  <Typography variant="body2" color="text.secondary">
                    {application.approver_3_comment}
                  </Typography>
                )}
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {canApproveThis && application.status === 'pending' && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  批核操作
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  當前階段：{text}
                </Typography>

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="批核意見"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button
                    variant={action === 'approve' ? 'contained' : 'outlined'}
                    color="success"
                    onClick={() => setAction('approve')}
                    fullWidth
                  >
                    批准
                  </Button>
                  <Button
                    variant={action === 'reject' ? 'contained' : 'outlined'}
                    color="error"
                    onClick={() => setAction('reject')}
                    fullWidth
                  >
                    拒絕
                  </Button>
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleSubmit}
                  disabled={approving}
                >
                  {approving ? '處理中...' : '提交'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default ApprovalDetail;

