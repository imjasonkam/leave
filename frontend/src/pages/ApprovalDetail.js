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
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [canApproveThis, setCanApproveThis] = useState(false);
  const [canRejectThis, setCanRejectThis] = useState(false);
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
      setCanRejectThis(false);
      setUserApprovalStage(null);
      return;
    }
    
    // 確定當前申請處於哪個階段（必須按順序：checker -> approver_1 -> approver_2 -> approver_3）
    const { stage } = getCurrentStage(application);
    
    // 檢查是否為 HR Group 成員（HR Group 成員可以隨時拒絕申請）
    const isHRMember = user?.is_hr_member || user?.is_system_admin;
    
    // 檢查用戶是否屬於當前階段的批核者（直接設置或通過授權群組）
    let isCurrentStageApprover = false;
    
    // 方法1：檢查是否直接設置為當前階段的批核者
    if (stage === 'checker' && application.checker_id === user?.id) {
      isCurrentStageApprover = true;
    } else if (stage === 'approver_1' && application.approver_1_id === user?.id) {
      isCurrentStageApprover = true;
    } else if (stage === 'approver_2' && application.approver_2_id === user?.id) {
      isCurrentStageApprover = true;
    } else if (stage === 'approver_3' && application.approver_3_id === user?.id) {
      isCurrentStageApprover = true;
    }
    
    // 方法2：如果不是直接批核者，檢查是否通過授權群組屬於當前階段的批核者
    if (!isCurrentStageApprover) {
      try {
        // 調用後端 API 檢查用戶是否有權限批核當前階段
        // 後端的 can-approve 現在只返回當前階段的權限
        const response = await axios.get(`/api/users/can-approve/${id}`);
        const canApproveFromBackend = response.data.canApprove || false;
        
        if (canApproveFromBackend) {
          // 後端返回可以批核，說明用戶是當前階段的批核者
          isCurrentStageApprover = true;
        }
      } catch (error) {
        console.error('Check approval permission error:', error);
      }
    }
    
    // HR Group 成員的特殊處理：可以隨時拒絕申請（即使不是當前階段）
    // 但只有當申請處於 approver_3 階段時，HR Group 成員才能批准
    if (isHRMember) {
      // HR Group 成員可以隨時拒絕申請（只要申請尚未完成）
      setCanRejectThis(true);
      // 只有當申請處於 approver_3 階段時，HR Group 成員才能批准
      if (stage === 'approver_3' && isCurrentStageApprover) {
        setCanApproveThis(true);
        setUserApprovalStage('approver_3');
      } else {
        setCanApproveThis(false);
        setUserApprovalStage(null);
      }
      return;
    }
    
    // 對於非 HR Group 成員，只有當前階段的批核者才能看到批核按鈕
    if (isCurrentStageApprover) {
      setCanApproveThis(true);
      setCanRejectThis(true); // 當前階段的批核者可以批准或拒絕
      setUserApprovalStage(stage);
    } else {
      // 未輪到的批核者只能查看申請資料，不能批核
      setCanApproveThis(false);
      setCanRejectThis(false);
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
                  secondary={
                    application.checker_at 
                      ? `已檢查於 ${application.checker_at}${application.checker_name ? ` - ${application.checker_name}` : ''}` 
                      : '待檢查'
                  }
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
                  secondary={
                    application.approver_1_at 
                      ? `已批核於 ${application.approver_1_at}${application.approver_1_name ? ` - ${application.approver_1_name}` : ''}` 
                      : application.checker_at ? '待批核' : '未開始'
                  }
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
                  secondary={
                    application.approver_2_at 
                      ? `已批核於 ${application.approver_2_at}${application.approver_2_name ? ` - ${application.approver_2_name}` : ''}` 
                      : application.approver_1_at ? '待批核' : '未開始'
                  }
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
                  secondary={
                    application.approver_3_at 
                      ? `已批核於 ${application.approver_3_at}${application.approver_3_name ? ` - ${application.approver_3_name}` : ''}` 
                      : application.approver_2_at ? '待批核' : '未開始'
                  }
                />
                {application.approver_3_remarks && (
                  <Typography variant="body2" color="text.secondary">
                    {application.approver_3_remarks}
                  </Typography>
                )}
              </ListItem>
              {application.status === 'rejected' && application.rejected_by_name && (
                <ListItem>
                  <ListItemText
                    primary="拒絕"
                    secondary={`已拒絕於 ${application.rejected_at || ''} - ${application.rejected_by_name}`}
                  />
                  {application.rejection_reason && (
                    <Typography variant="body2" color="text.secondary">
                      {application.rejection_reason}
                    </Typography>
                  )}
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {(canApproveThis || canRejectThis) && application.status === 'pending' && (
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
                  {canApproveThis && (
                    <Button
                      variant={action === 'approve' ? 'contained' : 'outlined'}
                      color="success"
                      onClick={() => setAction('approve')}
                      fullWidth
                    >
                      批准
                    </Button>
                  )}
                  {canRejectThis && (
                    <Button
                      variant={action === 'reject' ? 'contained' : 'outlined'}
                      color="error"
                      onClick={() => setAction('reject')}
                      fullWidth
                    >
                      拒絕
                    </Button>
                  )}
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleSubmit}
                  disabled={approving || !action}
                  sx={{
                    opacity: !action ? 0.5 : 1,
                    cursor: !action ? 'not-allowed' : 'pointer',
                    '&:disabled': {
                      backgroundColor: 'rgba(0, 0, 0, 0.12)',
                      color: 'rgba(0, 0, 0, 0.26)'
                    }
                  }}
                >
                  {approving ? '處理中...' : !action ? '請選擇批准或拒絕' : '提交'}
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

