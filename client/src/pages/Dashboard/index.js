import React, { useState } from 'react';
import {
  Typography,
  Container,
  Grid,
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
  Tabs,
  Tab,
  Rating,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Shield as ShieldIcon,
  Send as SendIcon,
  Star as StarIcon,
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
  const [selectedRangeDays, setSelectedRangeDays] = useState(180); // 180-day default retention window
  const [activeTab, setActiveTab] = useState(0); // 0: Departments, 1: Campaigns, 2: Templates, 3: Users

  const {
    dashboardData,
    timelineData,
    riskData,
    campaignAnalytics,
    templateAnalytics,
    userAnalytics,
  } = useDashboard(selectedRangeDays);

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Cyber Emerald
    if (score >= 60) return '#3b82f6'; // Cobalt
    if (score >= 40) return '#f59e0b'; // Amber
    return '#ef4444'; // Threat Red
  };

  const getRiskChip = (level) => {
    switch (level) {
      case 'Critical':
        return <Chip size="small" label="Critical Risk" sx={{ bgcolor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.4)' }} />;
      case 'High':
        return <Chip size="small" label="High Risk" sx={{ bgcolor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.4)' }} />;
      case 'Moderate':
        return <Chip size="small" label="Moderate" sx={{ bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 600, border: '1px solid rgba(59, 130, 246, 0.4)' }} />;
      default:
        return <Chip size="small" label="Low Risk" sx={{ bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.4)' }} />;
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#94a3b8',
          font: { family: 'Montserrat', size: 12, weight: 600 },
          usePointStyle: true,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', font: { family: 'Montserrat', size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', font: { family: 'Montserrat', size: 11 } },
      },
    },
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0b0f19' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="xl" sx={{ flexGrow: 1, mt: '80px', mb: 4, px: { xs: 2, sm: 3 } }}>
          
          {/* Header & 180-Day Range Selector */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: '#f8fafc',
                  fontSize: { xs: '1.4rem', md: '1.8rem' },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <ShieldIcon sx={{ color: '#3b82f6', fontSize: '2rem' }} />
                Cyber Command & Telemetry Dashboard
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                Real-time threat susceptibility telemetry with 180-day retention analysis.
              </Typography>
            </Box>

            {/* Range Toggle */}
            <ButtonGroup size="small" sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', p: 0.5 }}>
              {[7, 30, 90, 180].map((d) => (
                <Button
                  key={d}
                  onClick={() => setSelectedRangeDays(d)}
                  variant={selectedRangeDays === d ? 'contained' : 'text'}
                  sx={{
                    bgcolor: selectedRangeDays === d ? '#3b82f6' : 'transparent',
                    color: selectedRangeDays === d ? '#ffffff' : '#94a3b8',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    borderRadius: '8px !important',
                    px: 1.8,
                    '&:hover': { bgcolor: selectedRangeDays === d ? '#2563eb' : 'rgba(255, 255, 255, 0.05)' },
                  }}
                >
                  {d === 180 ? '180d (Max Retention)' : `${d}d`}
                </Button>
              ))}
            </ButtonGroup>
          </Box>

          {/* Top Metric Cards */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            
            {/* Simulations Delivered */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Simulations Sent
                    </Typography>
                    <SendIcon sx={{ color: '#3b82f6', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700, mb: 0.5 }}>
                    {dashboardData?.simulationsSent?.toLocaleString() || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Across {dashboardData?.totalCampaigns || 0} total campaigns
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Click Rate */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Phish Click Rate
                    </Typography>
                    <TrendingDownIcon sx={{ color: '#ef4444', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h4" sx={{ color: '#f87171', fontWeight: 700, mb: 0.5 }}>
                    {dashboardData?.clickRate || 0}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {dashboardData?.usersClicked || 0} unique compromised clicks
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Report Rate */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Reporting Rate
                    </Typography>
                    <TrendingUpIcon sx={{ color: '#10b981', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h4" sx={{ color: '#34d399', fontWeight: 700, mb: 0.5 }}>
                    {dashboardData?.reportRate || 0}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {dashboardData?.usersReported || 0} employees reported attacks
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Security Awareness Score */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Security Posture
                    </Typography>
                    <ShieldIcon sx={{ color: getScoreColor(dashboardData?.awarenessScore || 85), fontSize: 20 }} />
                  </Box>
                  <Typography variant="h4" sx={{ color: getScoreColor(dashboardData?.awarenessScore || 85), fontWeight: 700, mb: 0.5 }}>
                    {dashboardData?.awarenessScore || 85}/100
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {dashboardData?.awarenessScore >= 80 ? 'Robust Awareness' : 'Needs Remediation'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

          </Grid>

          {/* Time-Series Telemetry Chart */}
          <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '1rem' }}>
                  📈 Phishing Simulation Engagement Timeline ({selectedRangeDays} Days Window)
                </Typography>
                <Chip size="small" label="LEEF SIEM Stream Active" sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600, fontSize: '0.72rem' }} />
              </Box>
              <Box sx={{ height: 260 }}>
                {timelineData?.labels?.length > 0 ? (
                  <Line data={timelineData} options={chartOptions} />
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      No drill clicks or reports recorded in this {selectedRangeDays}-day time window.
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Multi-Dimensional Analytics Matrix */}
          <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
            <Box sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', px: 3, pt: 2 }}>
              <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1, fontSize: '1.05rem' }}>
                Multi-Dimensional Risk & Performance Analytics
              </Typography>
              <Tabs
                value={activeTab}
                onChange={(e, val) => setActiveTab(val)}
                sx={{
                  '& .MuiTab-root': {
                    color: '#94a3b8',
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '0.88rem',
                    minHeight: 44,
                    '&.Mui-selected': { color: '#60a5fa' },
                  },
                  '& .MuiTabs-indicator': { bgcolor: '#3b82f6', height: 3 },
                }}
              >
                <Tab label={`🏢 Department-Wise (${riskData?.length || 0})`} />
                <Tab label={`🚀 Campaign-Wise (${campaignAnalytics?.length || 0})`} />
                <Tab label={`✉️ Template-Wise (${templateAnalytics?.length || 0})`} />
                <Tab label={`👤 User Risk Watchlist (${userAnalytics?.repeatClickers?.length || 0})`} />
              </Tabs>
            </Box>

            <CardContent sx={{ p: 0 }}>
              
              {/* Tab 0: Department Matrix */}
              {activeTab === 0 && (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Department / Unit</TableCell>
                        <TableCell align="center">Simulations Sent</TableCell>
                        <TableCell align="center">Clicks</TableCell>
                        <TableCell align="center">Reported</TableCell>
                        <TableCell align="center">Click Rate</TableCell>
                        <TableCell align="center">Reporting Rate</TableCell>
                        <TableCell align="center">Risk Posture</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {riskData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#64748b' }}>
                            No department tracking data available in this time window.
                          </TableCell>
                        </TableRow>
                      ) : (
                        riskData.map((dept, idx) => (
                          <TableRow key={idx} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                            <TableCell sx={{ fontWeight: 600, color: '#f8fafc' }}>
                              {dept.name}
                            </TableCell>
                            <TableCell align="center">{dept.simulationsSent}</TableCell>
                            <TableCell align="center" sx={{ color: dept.clickCount > 0 ? '#f87171' : '#94a3b8' }}>{dept.clickCount}</TableCell>
                            <TableCell align="center" sx={{ color: dept.reportCount > 0 ? '#34d399' : '#94a3b8' }}>{dept.reportCount}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: dept.clickRate > 15 ? '#f87171' : '#cbd5e1' }}>
                              {dept.clickRate}%
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: '#34d399' }}>
                              {dept.reportRate || 0}%
                            </TableCell>
                            <TableCell align="center">
                              {getRiskChip(dept.riskLevel)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Tab 1: Campaign Matrix */}
              {activeTab === 1 && (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Campaign Drill</TableCell>
                        <TableCell>Scenario</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="center">Sent</TableCell>
                        <TableCell align="center">Clicks</TableCell>
                        <TableCell align="center">Reports</TableCell>
                        <TableCell align="center">Click Rate</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {campaignAnalytics.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#64748b' }}>
                            No campaigns found in this time period.
                          </TableCell>
                        </TableRow>
                      ) : (
                        campaignAnalytics.map((c) => (
                          <TableRow key={c.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                            <TableCell sx={{ fontWeight: 600, color: '#f8fafc' }}>{c.name}</TableCell>
                            <TableCell sx={{ color: '#94a3b8' }}>{c.templateName}</TableCell>
                            <TableCell align="center">
                              <Chip size="small" label={c.status} sx={{ bgcolor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 600, textTransform: 'capitalize' }} />
                            </TableCell>
                            <TableCell align="center">{c.sentCount}</TableCell>
                            <TableCell align="center" sx={{ color: c.clickCount > 0 ? '#f87171' : '#94a3b8' }}>{c.clickCount}</TableCell>
                            <TableCell align="center" sx={{ color: '#34d399' }}>{c.reportCount}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: c.clickRate > 15 ? '#f87171' : '#cbd5e1' }}>
                              {c.clickRate}%
                            </TableCell>
                            <TableCell align="center">
                              <Button size="small" onClick={() => navigate(`/console/campaign/${c.id}`)} sx={{ color: '#60a5fa', fontSize: '0.75rem' }}>
                                View Details →
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Tab 2: Template Vulnerability */}
              {activeTab === 2 && (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Threat Scenario Template</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell align="center">Difficulty</TableCell>
                        <TableCell align="center">Sent Drills</TableCell>
                        <TableCell align="center">Click Count</TableCell>
                        <TableCell align="center">Phish Success Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {templateAnalytics.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#64748b' }}>
                            No scenario analytics recorded yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        templateAnalytics.map((t) => (
                          <TableRow key={t.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                            <TableCell sx={{ fontWeight: 600, color: '#f8fafc' }}>
                              {t.name}
                              <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>{t.subject}</Typography>
                            </TableCell>
                            <TableCell sx={{ color: '#94a3b8' }}>{t.category}</TableCell>
                            <TableCell align="center">
                              <Rating value={t.difficulty} readOnly size="small" icon={<StarIcon sx={{ color: '#fbbf24', fontSize: '0.85rem' }} />} />
                            </TableCell>
                            <TableCell align="center">{t.simulationsSent}</TableCell>
                            <TableCell align="center" sx={{ color: t.clickCount > 0 ? '#f87171' : '#94a3b8' }}>{t.clickCount}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: t.clickRate > 20 ? '#f87171' : '#cbd5e1' }}>
                              {t.clickRate}%
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Tab 3: User Watchlist */}
              {activeTab === 3 && (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Target Employee</TableCell>
                        <TableCell>Department / OU</TableCell>
                        <TableCell align="center">System IP Address</TableCell>
                        <TableCell align="center">Simulations</TableCell>
                        <TableCell align="center">Clicks</TableCell>
                        <TableCell align="center">Reports</TableCell>
                        <TableCell align="center">Risk Profile</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {userAnalytics?.repeatClickers?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#34d399', fontWeight: 600 }}>
                            🎉 Zero repeat clickers identified in the current {selectedRangeDays}-day retention period!
                          </TableCell>
                        </TableRow>
                      ) : (
                        userAnalytics?.repeatClickers?.map((u, idx) => (
                          <TableRow key={idx} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                            <TableCell sx={{ fontWeight: 600, color: '#f8fafc' }}>
                              {u.name}
                              <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>{u.email}</Typography>
                            </TableCell>
                            <TableCell sx={{ color: '#94a3b8' }}>
                              {u.department} {u.ou ? `(${u.ou})` : ''}
                            </TableCell>
                            <TableCell align="center">
                              {u.ipAddress && u.ipAddress !== 'N/A' ? (
                                <Chip
                                  size="small"
                                  label={u.ipAddress}
                                  sx={{
                                    bgcolor: 'rgba(59, 130, 246, 0.15)',
                                    color: '#93c5fd',
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                    fontSize: '0.72rem',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                  }}
                                />
                              ) : (
                                <Typography variant="caption" sx={{ color: '#64748b' }}>—</Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">{u.simulationsReceived}</TableCell>
                            <TableCell align="center" sx={{ color: '#f87171', fontWeight: 700 }}>{u.clickCount}</TableCell>
                            <TableCell align="center" sx={{ color: '#34d399' }}>{u.reportCount}</TableCell>
                            <TableCell align="center">
                              <Chip
                                size="small"
                                label={u.riskTier}
                                sx={{
                                  bgcolor: u.riskTier === 'Chronic Clicker' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                  color: u.riskTier === 'Chronic Clicker' ? '#f87171' : '#fbbf24',
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  border: u.riskTier === 'Chronic Clicker' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
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
