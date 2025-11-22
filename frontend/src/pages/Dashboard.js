import React, { useEffect, useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  AccountBalance as AccountBalanceIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, isSystemAdmin, isDeptHead } = useAuth();
  const [stats, setStats] = useState({
    pendingApplications: 0,
    approvedApplications: 0,
    pendingApprovals: 0,
    totalBalance: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [applicationsRes, approvalsRes, balancesRes] = await Promise.all([
        axios.get('/api/leaves', { params: { status: 'pending' } }),
        isDeptHead || isSystemAdmin ? axios.get('/api/approvals/pending') : Promise.resolve({ data: { applications: [] } }),
        axios.get('/api/leaves/balances')
      ]);

      const currentYear = new Date().getFullYear();
      const currentBalances = balancesRes.data.balances || [];
      const totalBalance = currentBalances.reduce((sum, b) => sum + parseFloat(b.balance || 0), 0);

      setStats({
        pendingApplications: applicationsRes.data.applications?.length || 0,
        approvedApplications: 0,
        pendingApprovals: approvalsRes.data.applications?.length || 0,
        totalBalance
      });
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const cards = [
    {
      titleKey: 'pendingApplications',
      value: stats.pendingApplications,
      icon: <AssignmentIcon />,
      color: '#ff9800',
      show: true
    },
    {
      titleKey: 'pendingApprovals',
      value: stats.pendingApprovals,
      icon: <CheckCircleIcon />,
      color: '#2196f3',
      show: isDeptHead || isSystemAdmin
    },
    {
      titleKey: 'totalBalance',
      value: stats.totalBalance.toFixed(1),
      icon: <AccountBalanceIcon />,
      color: '#4caf50',
      show: true
    },
    {
      titleKey: 'approvedApplications',
      value: stats.approvedApplications,
      icon: <HistoryIcon />,
      color: '#9c27b0',
      show: true
    }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('dashboard.welcome', { name: user?.display_name || `${user?.surname} ${user?.given_name}` })}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {user?.department_name_zh} - {user?.position_name_zh}
      </Typography>

      <Grid container spacing={3}>
        {cards.filter(card => card.show).map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      {t(`dashboard.${card.titleKey}`)}
                    </Typography>
                    <Typography variant="h4">
                      {card.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: card.color, fontSize: 48 }}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Dashboard;

