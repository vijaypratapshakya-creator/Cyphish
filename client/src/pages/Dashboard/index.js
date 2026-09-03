import React, { useState } from 'react';
import {
  Typography,
  Container,
  Grid,
  Paper,
  Box,
  Card,
  CardContent,
  Chip,
  Button,
  ButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import {
  Campaign as CampaignIcon,
  People as PeopleIcon,
  Outbox as OutboxIcon,
  Email as EmailIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Shield as ShieldIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';

import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import { useDashboard } from '../../hooks/useDashboard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedRangeDays, setSelectedRangeDays] = useState(30);
  const { dashboardData, timelineData, riskData, systemStats } = useDashboard(selectedRangeDays);

  const getScoreColor = (score) => {
    if (score >= 80) return '#059669'; // Emerald
    if (score >= 60) return '#2563eb'; // Blue
    if (score >= 40) return '#d97706'; // Amber
    return '#dc2626'; // Red
  };

  const getRiskChip = (level) => {
    switch (level) {
      case 'Critical':
        return <Chip size="small" label="Critical Risk" sx={{ bgcolor: '#fef2f2', color: '#991b1b', fontWeight: 700, border: '1px solid #fecaca' }} />;
      case 'High':
        return <Chip size="small" label="High Risk" sx={{ bgcolor: '#fffbeb', color: '#92400e', fontWeight: 700, border: '1px solid #fde68a' }} />;
      case 'Moderate':
        return <Chip size="small" label="Moderate" sx={{ bgcolor: '#eff6ff', color: '#1e40af', fontWeight: 600, border: '1px solid #bfdbfe' }} />;
      default:
        return <Chip size="small" label="Low Risk" sx={{ bgcolor: '#ecfdf5', color: '#065f46', fontWeight: 600, border: '1px solid #a7f3d0' }} />;
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Montserrat', size: 12, weight: 600 },
          usePointStyle: true,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: 'Montserrat', weight: 700 },
        bodyFont: { family: 'Montserrat' },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: { stepSize: 1, font: { family: 'Montserrat', size: 11 } },
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Montserrat', size: 11 } },
      },
    },
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Sidebar />

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="xl" sx={{ flexGrow: 1, mt: '88px', mb: 4, px: { xs: 2, md: 4 } }}>
          
          {/* Header & Date Filter Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
            <div>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '1.4rem', md: '1.75rem' } }}>
                Executive Awareness Dashboard
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                Real-time phishing resilience metrics, threat simulation activity, and departmental vulnerability posture.
              </Typography>
            </div>

            <ButtonGroup variant="outlined" size="small" sx={{ bgcolor: '#ffffff', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              {[
                { label: '7 Days', value: 7 },
                { label: '30 Days', value: 30 },
                { label: '90 Days', value: 90 },
                { label: '6 Months', value: 180 },
              ].map((item) => (
                <Button
                  key={item.value}
                  onClick={() => setSelectedRangeDays(item.value)}
                  variant={selectedRangeDays === item.value ? 'contained' : 'outlined'}
                  sx={{
                    px: 2,
                    py: 0.8,
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    bgcolor: selectedRangeDays === item.value ? '#1d4ed8' : 'transparent',
                    color: selectedRangeDays === item.value ? '#ffffff' : '#475569',
                    borderColor: '#cbd5e1',
                    '&:hover': {
                      bgcolor: selectedRangeDays === item.value ? '#1e40af' : '#f1f5f9',
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </ButtonGroup>
          </Box>

          {/* Operational Readiness Bar */}
          {systemStats && (
            <Paper sx={{ p: 2, mb: 3, borderRadius: '14px', bgcolor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CheckCircleIcon sx={{ color: systemStats.counts.totalProfiles > 0 ? '#059669' : '#d97706', fontSize: 20 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>SMTP RELAY</Typography>
                      <Typography variant="body2" fontWeight={700} color="#0f172a">
                        {systemStats.counts.totalProfiles > 0 ? `${systemStats.counts.totalProfiles} Profile(s) Ready` : 'No Profile Set'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CheckCircleIcon sx={{ color: systemStats.system.ldapConfigured ? '#059669' : '#94a3b8', fontSize: 20 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>ACTIVE DIRECTORY</Typography>
                      <Typography variant="body2" fontWeight={700} color="#0f172a">
                        {systemStats.system.ldapConfigured ? 'Directory Connected' : 'LDAP Disabled'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CheckCircleIcon sx={{ color: systemStats.system.reportingConfigured ? '#059669' : '#94a3b8', fontSize: 20 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>SCHEDULED REPORTS</Typography>
                      <Typography variant="body2" fontWeight={700} color="#0f172a">
                        {systemStats.system.reportingConfigured ? 'Automated Dispatch Active' : 'Reports Not Configured'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3} sx={{ textAlign: { sm: 'right' } }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<SettingsIcon />}
                    onClick={() => navigate('/console/settings')}
                    sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.78rem' }}
                  >
                    Manage Settings
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* KPI Stat Cards Grid */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            {/* Posture Score Card */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', bgcolor: getScoreColor(dashboardData.awarenessScore) }} />
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Awareness Score
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 800, color: '#0f172a', mt: 1 }}>
                        {dashboardData.awarenessScore}<Typography component="span" variant="h6" sx={{ color: '#64748b' }}>/100</Typography>
                      </Typography>
                    </div>
                    <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: `${getScoreColor(dashboardData.awarenessScore)}15` }}>
                      <ShieldIcon sx={{ color: getScoreColor(dashboardData.awarenessScore), fontSize: 28 }} />
                    </Box>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={dashboardData.awarenessScore}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: '#f1f5f9',
                        '& .MuiLinearProgress-bar': { bgcolor: getScoreColor(dashboardData.awarenessScore) },
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#64748b', mt: 1, display: 'block' }}>
                      {dashboardData.awarenessScore >= 75 ? '🟢 High Organizational Resilience' : '🟠 Moderate - Training Recommended'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Click-Through Rate (CTR) Card */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', bgcolor: '#dc2626' }} />
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Simulation Click Rate
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 800, color: '#dc2626', mt: 1 }}>
                        {dashboardData.clickRate}%
                      </Typography>
                    </div>
                    <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#fee2e2' }}>
                      <TrendingDownIcon sx={{ color: '#dc2626', fontSize: 28 }} />
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748b', mt: 2 }}>
                    <strong>{dashboardData.totalClicks || dashboardData.usersClicked}</strong> clicks logged across <strong>{dashboardData.simulationsSent}</strong> emails.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Phish Reporting Rate Card */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', bgcolor: '#059669' }} />
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Reporting Rate
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 800, color: '#059669', mt: 1 }}>
                        {dashboardData.reportRate}%
                      </Typography>
                    </div>
                    <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#dcfce7' }}>
                      <TrendingUpIcon sx={{ color: '#059669', fontSize: 28 }} />
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748b', mt: 2 }}>
                    <strong>{dashboardData.usersReported}</strong> simulation emails reported by employees.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Campaign Activity Card */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', bgcolor: '#2563eb' }} />
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Active Campaigns
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 800, color: '#2563eb', mt: 1 }}>
                        {dashboardData.activeCampaigns}
                      </Typography>
                    </div>
                    <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: '#dbeafe' }}>
                      <CampaignIcon sx={{ color: '#2563eb', fontSize: 28 }} />
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748b', mt: 2 }}>
                    <strong>{dashboardData.completedCampaigns}</strong> completed • <strong>{dashboardData.totalContacts}</strong> enrolled targets.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Interactive Timeline Chart & Quick Actions */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Timeline Line Chart */}
            <Grid item xs={12} lg={8}>
              <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <div>
                      <Typography variant="h6" fontWeight={700} color="#0f172a">
                        Simulation Activity Timeline
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Daily link click attempts vs. suspicious email reports.
                      </Typography>
                    </div>
                  </Box>
                  <Box sx={{ height: 280 }}>
                    {timelineData.labels?.length > 0 ? (
                      <Line data={timelineData} options={chartOptions} />
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Typography variant="body2" color="text.secondary">
                          No simulation click or report events recorded in the last {selectedRangeDays} days.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Command & Quick Actions Card */}
            <Grid item xs={12} lg={4}>
              <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} color="#0f172a" sx={{ mb: 1 }}>
                    Quick Actions Center
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Launch new drills and manage awareness resources.
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<SendIcon />}
                      onClick={() => navigate('/console/campaign/create')}
                      sx={{
                        py: 1.2,
                        borderRadius: '12px',
                        fontWeight: 600,
                        bgcolor: '#1d4ed8',
                        '&:hover': { bgcolor: '#1e40af' },
                      }}
                    >
                      Start New Campaign Drill
                    </Button>

                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<PeopleIcon />}
                      onClick={() => navigate('/console/audience/create')}
                      sx={{ py: 1, borderRadius: '12px', fontWeight: 600 }}
                    >
                      Import Audience Contacts
                    </Button>

                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<EmailIcon />}
                      onClick={() => navigate('/console/templates/new')}
                      sx={{ py: 1, borderRadius: '12px', fontWeight: 600 }}
                    >
                      Compose Email Template
                    </Button>

                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<OutboxIcon />}
                      onClick={() => navigate('/console/sender-profile/create')}
                      sx={{ py: 1, borderRadius: '12px', fontWeight: 600 }}
                    >
                      Configure SMTP Relay
                    </Button>

                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<AssessmentIcon />}
                      onClick={() => navigate('/console/reports')}
                      sx={{ py: 1, borderRadius: '12px', fontWeight: 600 }}
                    >
                      Export HR & SOC Reports
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Department Vulnerability Posture Table */}
          <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <div>
                  <Typography variant="h6" fontWeight={700} color="#0f172a">
                    Department Vulnerability Breakdown
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Helps HR and SOC teams pinpoint high-risk teams requiring dedicated awareness follow-up.
                  </Typography>
                </div>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => navigate('/console/reports')}
                  sx={{ borderRadius: '8px', fontWeight: 600 }}
                >
                  View Full Risk Reports
                </Button>
              </Box>

              {riskData.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No departmental data available yet. Launch a simulation to view team-by-team risk rankings.
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        <TableCell><strong>Department / Team</strong></TableCell>
                        <TableCell align="center"><strong>Simulations Sent</strong></TableCell>
                        <TableCell align="center"><strong>Users Clicked</strong></TableCell>
                        <TableCell align="center"><strong>Users Reported</strong></TableCell>
                        <TableCell align="center"><strong>Click-Through Rate</strong></TableCell>
                        <TableCell align="center"><strong>Risk Posture</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {riskData.slice(0, 8).map((row, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>{row.name}</TableCell>
                          <TableCell align="center">{row.simulationsSent}</TableCell>
                          <TableCell align="center" sx={{ color: row.usersClicked > 0 ? '#dc2626' : 'inherit', fontWeight: row.usersClicked > 0 ? 700 : 400 }}>
                            {row.usersClicked}
                          </TableCell>
                          <TableCell align="center" sx={{ color: row.usersReported > 0 ? '#059669' : 'inherit', fontWeight: row.usersReported > 0 ? 700 : 400 }}>
                            {row.usersReported}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>
                            {row.clickRate}%
                          </TableCell>
                          <TableCell align="center">
                            {getRiskChip(row.riskLevel)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

        </Container>
        <Footer />
      </Box>
    </Box>
  );
};

export default Dashboard;
