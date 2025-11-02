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
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const LeaveBalance = () => {
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

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        假期餘額
      </Typography>

      <Paper sx={{ mt: 2, p: 2 }}>
        <FormControl sx={{ mb: 2, minWidth: 200 }}>
          <InputLabel>年份</InputLabel>
          <Select
            value={year}
            label="年份"
            onChange={(e) => setYear(e.target.value)}
          >
            {years.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>假期類型</TableCell>
                <TableCell align="right">餘額</TableCell>
                <TableCell align="right">已使用</TableCell>
                <TableCell align="right">總額</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">載入中...</TableCell>
                </TableRow>
              ) : balances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">沒有假期餘額記錄</TableCell>
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

