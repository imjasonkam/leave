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
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import YearSelector from '../components/YearSelector';

const LeaveBalance = () => {
  const { t } = useTranslation();
  const { user, isSystemAdmin, isDeptHead } = useAuth();
  const [balances, setBalances] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalances();
  }, [year]);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/leaves/balances', {
        params: { year, user_id: user.id }
      });
      setBalances(response.data.balances || []);
    } catch (error) {
      console.error('Fetch balances error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {t('leaveBalance.title')}
      </Typography>

      <Paper sx={{ mt: 2, p: 2 }}>
        <YearSelector
          value={year}
          onChange={(year) => setYear(year)}
          labelKey="leaveBalance.year"
          sx={{ mb: 2, minWidth: 200 }}
        />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('leaveBalance.leaveType')}</TableCell>
                <TableCell align="right">{t('leaveBalance.balance')}</TableCell>
                <TableCell align="right">{t('leaveBalance.taken')}</TableCell>
                <TableCell align="right">{t('leaveBalance.total')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">{t('common.loading')}</TableCell>
                </TableRow>
              ) : balances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">{t('leaveBalance.noBalanceRecords')}</TableCell>
                </TableRow>
              ) : (
                balances.map((balance) => (
                  <TableRow key={balance.id}>
                    <TableCell>
                      {balance.leave_type_name_zh} ({balance.leave_type_code})
                    </TableCell>
                    <TableCell align="right">
                      <strong>{parseFloat(balance.balance).toFixed(1)}</strong>
                    </TableCell>
                    <TableCell align="right">
                      {parseFloat(balance.taken).toFixed(1)}
                    </TableCell>
                    <TableCell align="right">
                      {(parseFloat(balance.balance) + parseFloat(balance.taken)).toFixed(1)}
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

export default LeaveBalance;

