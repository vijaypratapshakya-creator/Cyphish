import React from 'react';
import {
  Typography,
  Container,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import BusinessIcon from '@mui/icons-material/Business';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import { useAudience } from '../../hooks/useAudience';
import { formatCardDate } from '../../utils/dateUtils';

const Audience = () => {
  const navigate = useNavigate();
  const { audiences, loading, error } = useAudience();

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
                <GroupIcon sx={{ color: '#3b82f6', fontSize: '2rem' }} />
                Audience & Target Groups Hub
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                Manage target employees, Active Directory synced groups, departments, and custom drill lists.
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/console/audience/create')}
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
              New Target List
            </Button>
          </Box>

          {/* Cards Grid */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#3b82f6' }} />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              {error}
            </Alert>
          ) : audiences.length === 0 ? (
            <Card sx={{ bgcolor: '#111827', border: '1px dashed rgba(255, 255, 255, 0.15)', p: 6, textAlign: 'center', borderRadius: '16px' }}>
              <GroupIcon sx={{ fontSize: 48, color: '#64748b', mb: 1.5 }} />
              <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                No Target Groups Created Yet
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 460, mx: 'auto', mt: 1, mb: 3 }}>
                Import your employee directories via CSV or query Active Directory OUs to start grouping simulation targets.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/console/audience/create')}
                sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 700 }}
              >
                Create Target Group
              </Button>
            </Card>
          ) : (
            <Grid container spacing={3}>
              {audiences.map((aud) => {
                const contactCount = aud.contacts?.length || 0;
                const hasLdap = aud.contacts?.some((c) => c.source === 'ldap' || c.directoryDn);

                return (
                  <Grid item xs={12} md={6} lg={4} key={aud._id}>
                    <Card
                      onClick={() => navigate(`/console/audience/${aud._id}`)}
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
                            {aud.name}
                          </Typography>
                          <ArrowForwardIosIcon sx={{ fontSize: 16, color: '#64748b' }} />
                        </Box>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
                          <Chip
                            size="small"
                            icon={<PersonOutlineIcon sx={{ fontSize: '0.9rem !important' }} />}
                            label={`${contactCount} Target${contactCount === 1 ? '' : 's'}`}
                            sx={{ bgcolor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 700, border: '1px solid rgba(59, 130, 246, 0.3)' }}
                          />
                          {hasLdap && (
                            <Chip
                              size="small"
                              icon={<CloudSyncIcon sx={{ fontSize: '0.9rem !important' }} />}
                              label="AD Synced"
                              sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.3)' }}
                            />
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            Created: {formatCardDate(aud.createdAt)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 600 }}>
                            Manage Contacts →
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

export default Audience;
