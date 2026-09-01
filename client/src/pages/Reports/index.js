import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Container, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import { axiosInstance } from '../../services/axiosInstance';

const toDate = (date) => date.toISOString().slice(0, 10);
const defaultStart = () => toDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

export default function Reports() {
  const [start, setStart] = useState(defaultStart()); const [end, setEnd] = useState(toDate(new Date()));
  const [groupBy, setGroupBy] = useState('department'); const [summary, setSummary] = useState(null); const [rows, setRows] = useState([]); const [error, setError] = useState('');
  const load = async () => {
    setError('');
    try {
      const query = { start, end, groupBy }; const [overview, risk] = await Promise.all([axiosInstance.get('/api/dashboard/overview', { params: query }), axiosInstance.get('/api/dashboard/risk', { params: query })]);
      setSummary(overview.data.data); setRows(risk.data.data);
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to load reporting data.'); }
  };
  useEffect(() => { load(); }, []); // Initial 30-day report
  return <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f4f7f6' }}><Sidebar /><Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}><Container maxWidth="lg" sx={{ mt: '88px', mb: 3 }}>
    <Typography variant="h4" fontWeight={700} color="#004d40">Reports & risk</Typography><Typography color="text.secondary" sx={{ mb: 3 }}>Analyze up to six months of authorized training activity.</Typography>
    <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center"><TextField label="Start date" type="date" value={start} onChange={(event) => setStart(event.target.value)} InputLabelProps={{ shrink: true }} /><TextField label="End date" type="date" value={end} onChange={(event) => setEnd(event.target.value)} InputLabelProps={{ shrink: true }} /><FormControl sx={{ minWidth: 170 }}><InputLabel>Group by</InputLabel><Select label="Group by" value={groupBy} onChange={(event) => setGroupBy(event.target.value)}><MenuItem value="user">User</MenuItem><MenuItem value="department">Department</MenuItem><MenuItem value="group">AD group</MenuItem></Select></FormControl><Button variant="contained" onClick={load} sx={{ bgcolor: '#00695c' }}>Apply filters</Button></Stack></Paper>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {summary && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>{[['Active campaigns', summary.activeCampaigns], ['Completed campaigns', summary.completedCampaigns], ['Total users', summary.totalUsers], ['Users clicked', summary.usersClicked]].map(([label, value]) => <Paper key={label} sx={{ p: 2, flex: 1, borderRadius: 3 }}><Typography color="text.secondary">{label}</Typography><Typography variant="h4" fontWeight={700}>{value}</Typography></Paper>)}</Stack>}
    <Paper sx={{ overflowX: 'auto', borderRadius: 3 }}><Table size="small"><TableHead><TableRow><TableCell>{groupBy === 'user' ? 'User' : groupBy === 'group' ? 'AD group' : 'Department'}</TableCell><TableCell align="right">Users clicked</TableCell><TableCell align="right">Click events</TableCell><TableCell align="right">Risk score</TableCell></TableRow></TableHead><TableBody>{rows.length ? rows.map((row) => <TableRow key={row.name}><TableCell>{row.name}</TableCell><TableCell align="right">{row.usersClicked}</TableCell><TableCell align="right">{row.clickCount}</TableCell><TableCell align="right"><strong>{row.riskScore}/100</strong></TableCell></TableRow>) : <TableRow><TableCell colSpan={4} align="center">No click activity in this period.</TableCell></TableRow>}</TableBody></Table></Paper>
  </Container><Footer /></Box></Box>;
}
