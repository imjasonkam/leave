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
  const [canApproveThis, setCanApproveThis] = useState(false);
  const [userApprovalStage, setUserApprovalStage] = useState(null);

  useEffect(() => {
    fetchApplication();
  }, [id]);

  useEffect(() => {
    if (application && user) {
      checkCanApprove();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application, user, id]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`/api/leaves/${id}`);
      setApplication(response.data.application);
    } catch (error) {
      console.error('Fetch application error:', error);
      if (error.response?.status === 403) {
        setError('無權限查看此申請');
      } else if (error.response?.status === 404) {
        setError('申請不存在');
      } else {
        setError('獲取申請詳情時發生錯誤');
      }
      setApplication(null);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStage = (app) => {
    if (!app.checker_at && app.checker_id) return { stage: 'checker', text: '檢查' };
    if (!app.approver_1_at && app.approver_1_id) return { stage: 'approver_1', text: '第一批核' };
    if (!app.approver_2_at && app.approver_2_id) return { stage: 'approver_2', text: '第二批核' };
    if (!app.approver_3_at && app.approver_3_id) return { stage: 'approver_3', text: '第三批核' };
    return { stage: 'completed', text: '已完成' };
  };

  const checkCanApprove = async () => {
    if (!application || application.status !== 'pending') {
      setCanApproveThis(false);
      setUserApprovalStage(null);
      return;
    }
    
    // 檢查是否直接設置為批核者
    const { stage } = getCurrentStage(application);
    const isDirectApprover = 
      (stage === 'checker' && application.checker_id === user?.id) ||
      (stage === 'approver_1' && application.approver_1_id === user?.id) ||
      (stage === 'approver_2' && application.approver_2_id === user?.id) ||
      (stage === 'approver_3' && application.approver_3_id === user?.id);
    
    if (isDirectApprover) {
      setCanApproveThis(true);
      setUserApprovalStage(stage);
      return;
    }
    
    // 優先檢查：如果用戶是 HR Group 成員，且申請已設置 approver_3_id 但尚未批核
    // HR Group 成員應該能夠批核所有申請的 approver_3 階段
    if (application.approver_3_id && !application.approver_3_at) {
      const isHRMember = user?.is_hr_member || user?.is_system_admin;
      if (isHRMember) {
        setCanApproveThis(true);
        setUserApprovalStage('approver_3');
        return;
      }
    }
    
    // 如果直接檢查不通過，通過後端 API 檢查（包括授權群組成員的情況）
    // 這個 API 會檢查用戶是否屬於任何階段的授權群組，包括 approver_3
    // 後端已經處理了所有情況，包括 HR 群組（approver_3）的特殊情況
    try {
      const response = await axios.get(`/api/users/can-approve/${id}`);
      const canApprove = response.data.canApprove || false;
      setCanApproveThis(canApprove);
      
      // 如果用戶可以批核，確定用戶應該批核的階段
      if (canApprove) {
        // 如果申請已設置 approver_3_id 且尚未批核，且用戶不是直接設置的批核者，
        // 那麼用戶可能是 approver_3 群組成員
        if (application.approver_3_id && !application.approver_3_at && application.approver_3_id !== user?.id) {
          setUserApprovalStage('approver_3');
        } else {
          // 否則使用當前階段
          setUserApprovalStage(stage);
        }
      } else {
        setUserApprovalStage(null);
      }
    } catch (error) {
      console.error('Check approval permission error:', error);
      setCanApproveThis(false);
      setUserApprovalStage(null);
    }
  };

  const handleSubmit = async () => {
    if (!application) return;

    setError('');
    setSuccess('');
    setApproving(true);

    try {
      await axios.post(`/api/approvals/${id}/approve`, {
        action,
        remarks: comment
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
  // 如果用戶有特定的批核階段，使用該階段；否則使用當前階段
  const displayStage = userApprovalStage || stage;
  const displayText = userApprovalStage === 'checker' ? '檢查' :
                      userApprovalStage === 'approver_1' ? '第一批核' :
                      userApprovalStage === 'approver_2' ? '第二批核' :
                      userApprovalStage === 'approver_3' ? '第三批核' :
                      text;

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
                  secondary={application.checker_at ? `已檢查於 ${application.checker_at}` : '待檢查'}
                />
                {application.checker_remarks && (
                  <Typography variant="body2" color="text.secondary">
                    {application.checker_remarks}
                  </Typography>
                )}
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="第一批核"
                  secondary={application.approver_1_at ? `已批核於 ${application.approver_1_at}` : '待批核'}
                />
                {application.approver_1_remarks && (
                  <Typography variant="body2" color="text.secondary">
                    {application.approver_1_remarks}
                  </Typography>
                )}
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="第二批核"
                  secondary={application.approver_2_at ? `已批核於 ${application.approver_2_at}` : application.approver_1_at ? '待批核' : '未開始'}
                />
                {application.approver_2_remarks && (
                  <Typography variant="body2" color="text.secondary">
                    {application.approver_2_remarks}
                  </Typography>
                )}
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="第三批核 (HR)"
                  secondary={application.approver_3_at ? `已批核於 ${application.approver_3_at}` : application.approver_2_at ? '待批核' : '未開始'}
                />
                {application.approver_3_remarks && (
                  <Typography variant="body2" color="text.secondary">
                    {application.approver_3_remarks}
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
                  批核階段：{displayText}
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

