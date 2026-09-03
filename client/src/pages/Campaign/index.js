import React, { useEffect } from 'react';
import {
  Typography,
  Container,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import CampaignIcon from '@mui/icons-material/Campaign';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import { useGetAllCampaigns } from '../../hooks/useCampaign';
import { formatCardDate } from '../../utils/dateUtils';

const Campaign = () => {
  const navigate = useNavigate();
  const { getAllCampaigns, campaigns, loading, error } = useGetAllCampaigns();

  useEffect(() => {
    getAllCampaigns();
  }, [getAllCampaigns]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ongoing':
        return <Chip size="small" label="🟢 LIVE DRILL" sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.3)' }} />;
      case 'completed':
        return <Chip size="small" label="🔵 COMPLETED" sx={{ bgcolor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 700, border: '1px solid rgba(59, 130, 246, 0.3)' }} />;
      case 'stopped':
        return <Chip size="small" label="🔴 TERMINATED" sx={{ bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.3)' }} />;
      default:
        return <Chip size="small" label="🟡 READY / DRAFT" sx={{ bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.3)' }} />;
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0b0f19' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="xl" sx={{ flexGrow: 1, mt: '80px', mb: 4, px: { xs: 2, sm: 3 } }}>
          
          {/* Header */}
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
                <CampaignIcon sx={{ color: '#3b82f6', fontSize: '2rem' }} />
                Phishing Simulation Command Center
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                Execute controlled security drills, monitor real-time employee engagement telemetry, and enforce remediation.
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/console/campaign/create')}
              sx={{
                bgcolor: '#3b82f6',
                color: '#fff',
                px: 3,
                py: 1.2,
                borderRadius: '10px',
                fontWeight: 700,
                '&:hover': { bgcolor: '#2563eb' },
              }}
            >
              Launch New Drill
            </Button>
          </Box>

          {/* Campaign List */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#3b82f6' }} />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              {error}
            </Alert>
          ) : campaigns.length === 0 ? (
            <Card sx={{ bgcolor: '#111827', border: '1px dashed rgba(255, 255, 255, 0.15)', p: 6, textAlign: 'center', borderRadius: '16px' }}>
              <CampaignIcon sx={{ fontSize: 48, color: '#64748b', mb: 1.5 }} />
              <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                No Phishing Simulations Active
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 460, mx: 'auto', mt: 1, mb: 3 }}>
                Configure an audience group, select a realistic threat scenario, and start your organization's first controlled assessment drill.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/console/campaign/create')}
                sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 700 }}
              >
                Launch Drill
              </Button>
            </Card>
          ) : (
            <Grid container spacing={3}>
              {campaigns.map((camp) => {
                const totalTargets = camp.targetsCount || camp.audience?.contacts?.length || 0;
                const sentCount = camp.sentCount || 0;
                const progressPct = totalTargets > 0 ? Math.min(100, Math.round((sentCount / totalTargets) * 100)) : 100;

                return (
                  <Grid item xs={12} md={6} lg={4} key={camp._id}>
                    <Card
                      onClick={() => navigate(`/console/campaign/${camp._id}`)}
                      sx={{
                        bgcolor: '#111827',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        '&:hover': {
                          borderColor: 'rgba(59, 130, 246, 0.4)',
                          transform: 'translateY(-3px)',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                        },
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                            {camp.name}
                          </Typography>
                          <ArrowForwardIosIcon sx={{ fontSize: 16, color: '#64748b' }} />
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          {getStatusBadge(camp.status)}
                        </Box>

                        {/* Telemetry Snapshot */}
                        <Box sx={{ bgcolor: '#0b0f19', p: 1.8, borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)', mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                              Scenario:
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                              {camp.template?.name || 'Custom Scenario'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                              Target Group:
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#60a5fa', fontWeight: 600 }}>
                              {camp.audience?.name || 'All Staff'}
                            </Typography>
                          </Box>
                          
                          {/* Progress */}
                          <Box sx={{ mt: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                Dispatch Velocity
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700 }}>
                                {progressPct}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={progressPct}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: 'rgba(255, 255, 255, 0.06)',
                                '& .MuiLinearProgress-bar': { bgcolor: '#10b981' },
                              }}
                            />
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.5, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            Created: {formatCardDate(camp.createdAt)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 700 }}>
                            Live Telemetry →
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

        </Container>
        <Footer />
      </Box>
    </Box>
  );
};

export default Campaign;
