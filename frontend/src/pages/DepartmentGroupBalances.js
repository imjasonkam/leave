import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const DepartmentGroupBalances = () => {
  const { user } = useAuth();
  const [departmentGroups, setDepartmentGroups] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    fetchDepartmentGroupBalances();
  }, [year]);

  const fetchDepartmentGroupBalances = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/leaves/department-group-balances', {
        params: { year }
      });
      setDepartmentGroups(response.data.departmentGroups || []);
      
      // 預設展開第一個群組
      if (response.data.departmentGroups && response.data.departmentGroups.length > 0) {
        setExpandedGroups({ [response.data.departmentGroups[0].id]: true });
      }
    } catch (error) {
      console.error('Fetch department group balances error:', error);
      setError(error.response?.data?.message || '獲取部門群組假期餘額時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  const handleAccordionChange = (groupId) => (event, isExpanded) => {
    setExpandedGroups({
      ...expandedGroups,
      [groupId]: isExpanded
    });
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const getRoleChips = (deptGroup) => {
    const chips = [];
    if (deptGroup.checker_id) {
      chips.push(
        <Chip 
          key="checker" 
          label={`檢查者: ${deptGroup.checker_name_zh || deptGroup.checker_name}`} 
          size="small" 
          color="primary" 
          sx={{ mr: 1, mb: 1 }}
        />
      );
    }
    if (deptGroup.approver_1_id) {
      chips.push(
        <Chip 
          key="approver1" 
          label={`第一批核: ${deptGroup.approver_1_name_zh || deptGroup.approver_1_name}`} 
          size="small" 
          color="secondary" 
          sx={{ mr: 1, mb: 1 }}
        />
      );
    }
    if (deptGroup.approver_2_id) {
      chips.push(
        <Chip 
          key="approver2" 
          label={`第二批核: ${deptGroup.approver_2_name_zh || deptGroup.approver_2_name}`} 
          size="small" 
          color="success" 
          sx={{ mr: 1, mb: 1 }}
        />
      );
    }
    if (deptGroup.approver_3_id) {
      chips.push(
        <Chip 
          key="approver3" 
          label={`第三批核: ${deptGroup.approver_3_name_zh || deptGroup.approver_3_name}`} 
          size="small" 
          color="warning" 
          sx={{ mr: 1, mb: 1 }}
        />
      );
    }
    return chips;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        部門群組假期餘額
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

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {departmentGroups.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            您目前沒有權限查看任何部門群組的假期餘額
          </Alert>
        ) : (
          <Box>
            {departmentGroups.map((deptGroup) => (
              <Accordion
                key={deptGroup.id}
                expanded={expandedGroups[deptGroup.id] || false}
                onChange={handleAccordionChange(deptGroup.id)}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">
                      {deptGroup.name_zh || deptGroup.name}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, ml: 2 }}>
                      {getRoleChips(deptGroup)}
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {deptGroup.members && deptGroup.members.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>員工編號</TableCell>
                            <TableCell>姓名</TableCell>
                            <TableCell>部門</TableCell>
                            <TableCell>職位</TableCell>
                            <TableCell>假期類型</TableCell>
                            <TableCell align="right">餘額</TableCell>
                            <TableCell align="right">已使用</TableCell>
                            <TableCell align="right">總額</TableCell>
                            <TableCell>有效期</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {deptGroup.members.map((member) => (
                            <React.Fragment key={member.id}>
                              {member.balances && member.balances.length > 0 ? (
                                member.balances.map((balance, index) => (
                                  <TableRow key={`${member.id}-${balance.leave_type_id}-${index}`}>
                                    {index === 0 && (
                                      <>
                                        <TableCell rowSpan={member.balances.length}>
                                          {member.employee_number}
                                        </TableCell>
                                        <TableCell rowSpan={member.balances.length}>
                                          {member.display_name || member.name_zh || `${member.surname} ${member.given_name}`}
                                        </TableCell>
                                        <TableCell rowSpan={member.balances.length}>
                                          {member.department_name_zh || member.department_name}
                                        </TableCell>
                                        <TableCell rowSpan={member.balances.length}>
                                          {member.position_name_zh || member.position_name}
                                        </TableCell>
                                      </>
                                    )}
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
                                    <TableCell>
                                      {balance.start_date && balance.end_date ? (
                                        `${dayjs(balance.start_date).format('YYYY-MM-DD')} 至 ${dayjs(balance.end_date).format('YYYY-MM-DD')}`
                                      ) : balance.start_date ? (
                                        `自 ${dayjs(balance.start_date).format('YYYY-MM-DD')} 起`
                                      ) : balance.end_date ? (
                                        `至 ${dayjs(balance.end_date).format('YYYY-MM-DD')} 止`
                                      ) : (
                                        '-'
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell>{member.employee_number}</TableCell>
                                  <TableCell>
                                    {member.display_name || member.name_zh || `${member.surname} ${member.given_name}`}
                                  </TableCell>
                                  <TableCell>{member.department_name_zh || member.department_name}</TableCell>
                                  <TableCell>{member.position_name_zh || member.position_name}</TableCell>
                                  <TableCell colSpan={5} align="center">
                                    無假期餘額記錄
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">
                      此部門群組目前沒有成員
                    </Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default DepartmentGroupBalances;

