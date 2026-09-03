import React, { useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import SecurityIcon from '@mui/icons-material/Security';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import StarIcon from '@mui/icons-material/Star';
import DnsIcon from '@mui/icons-material/Dns';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import { useSenderProfiles } from '../../hooks/useSenderProfiles';
import { useNavigate } from 'react-router-dom';

const SenderProfile = () => {
  const navigate = useNavigate();
  const { senderProfiles, loading, handleDelete, testConnection } = useSenderProfiles();

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [testTesting, setTestTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleOpenTest = (profile) => {
    setSelectedProfile(profile);
    setTestResult(null);
    setTestModalOpen(true);
  };

  const handleRunTest = async () => {
    if (!selectedProfile) return;
    setTestTesting(true);
    setTestResult(null);
    const res = await testConnection({ profileId: selectedProfile._id });
    setTestResult(res);
    setTestTesting(false);
  };

  const getEncryptionLabel = (profile) => {
    const mode = profile.encryptionMode || (profile.secure ? 'smtps_direct' : 'starttls_strict');
    switch (mode) {
      case 'starttls_strict':
        return { label: `STARTTLS Strict (${profile.minTlsVersion || 'TLSv1.3'})`, color: 'success' };
      case 'smtps_direct':
        return { label: `Direct SMTPS (${profile.minTlsVersion || 'TLSv1.3'})`, color: 'primary' };
      case 'starttls_opportunistic':
        return { label: 'STARTTLS Opportunistic', color: 'warning' };
      default:
        return { label: 'Plaintext (No Encryption)', color: 'error' };
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
                <DnsIcon sx={{ color: '#3b82f6', fontSize: '2rem' }} />
                SMTP Relay Stations
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                Configure on-prem Exchange relays, corporate Root CA certificates, and strict TLS 1.3 delivery channels.
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/console/sender-profile/create')}
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
              Add Relay Profile
            </Button>
          </Box>

          {/* Profiles Grid */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#3b82f6' }} />
            </Box>
          ) : senderProfiles.length === 0 ? (
            <Card sx={{ bgcolor: '#111827', border: '1px dashed rgba(255, 255, 255, 0.15)', p: 6, textAlign: 'center', borderRadius: '16px' }}>
              <SecurityIcon sx={{ fontSize: 48, color: '#64748b', mb: 1.5 }} />
              <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                No SMTP Relay Profiles Configured
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 460, mx: 'auto', mt: 1, mb: 3 }}>
                Connect CyPhish to your Exchange server, Postfix relay, or cloud SMTP service to begin launching authorized phishing simulations.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/console/sender-profile/create')}
                sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 700 }}
              >
                Configure Relay
              </Button>
            </Card>
          ) : (
            <Grid container spacing={3}>
              {senderProfiles.map((profile) => {
                const enc = getEncryptionLabel(profile);
                const hasCa = Boolean(profile.customCaCertificate && profile.customCaCertificate.trim());

                return (
                  <Grid item xs={12} md={6} lg={4} key={profile._id}>
                    <Card
                      sx={{
                        bgcolor: '#111827',
                        border: profile.isDefault ? '1px solid rgba(59, 130, 246, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        transition: 'all 0.25s ease',
                        position: 'relative',
                        boxShadow: profile.isDefault ? '0 0 20px rgba(59, 130, 246, 0.15)' : 'none',
                        '&:hover': {
                          borderColor: 'rgba(59, 130, 246, 0.4)',
                          transform: 'translateY(-3px)',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                        },
                      }}
                    >
                      {profile.isDefault && (
                        <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                          <Chip
                            icon={<StarIcon sx={{ fontSize: '0.9rem !important', color: '#fbbf24 !important' }} />}
                            label="Default Relay"
                            size="small"
                            sx={{ bgcolor: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', fontWeight: 700, border: '1px solid rgba(251, 191, 36, 0.3)' }}
                          />
                        </Box>
                      )}

                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 0.5 }}>
                            {profile.senderName}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {profile.host}:{profile.port}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
                          <Chip
                            size="small"
                            label={enc.label}
                            color={enc.color}
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                          />
                          {hasCa && (
                            <Chip
                              size="small"
                              icon={<VpnKeyIcon sx={{ fontSize: '0.85rem !important' }} />}
                              label="Exchange Root CA Active"
                              sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600, fontSize: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                            />
                          )}
                          {profile.email && (
                            <Chip
                              size="small"
                              label={`Auth: ${profile.email}`}
                              sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', color: '#cbd5e1', fontSize: '0.75rem' }}
                            />
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PlayArrowIcon />}
                            onClick={() => handleOpenTest(profile)}
                            sx={{
                              borderColor: 'rgba(59, 130, 246, 0.5)',
                              color: '#60a5fa',
                              fontWeight: 600,
                              borderRadius: '8px',
                              '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' },
                            }}
                          >
                            Test TLS Handshake
                          </Button>

                          <Tooltip title="Delete Profile">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(profile._id)}
                              sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {/* Live TLS Handshake Test Modal */}
          <Dialog
            open={testModalOpen}
            onClose={() => !testTesting && setTestModalOpen(false)}
            PaperProps={{
              sx: {
                bgcolor: '#111827',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                p: 1,
                minWidth: { xs: '90%', sm: 480 },
              }
            }}
          >
            <DialogTitle sx={{ color: '#f8fafc', fontWeight: 700, pb: 1 }}>
              Live TLS & SMTP Handshake Verification
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
                Testing live socket connection, certificate trust chain, and authentication against:
                <br />
                <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>
                  {selectedProfile?.host}:{selectedProfile?.port}
                </strong>
              </Typography>

              {testTesting && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3, justifyContent: 'center' }}>
                  <CircularProgress size={24} sx={{ color: '#3b82f6' }} />
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                    Initiating TLS handshake & verifying trust chain...
                  </Typography>
                </Box>
              )}

              {testResult && (
                <Alert
                  severity={testResult.success ? 'success' : 'error'}
                  icon={testResult.success ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
                  sx={{
                    bgcolor: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: testResult.success ? '#34d399' : '#f87171',
                    border: testResult.success ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    mt: 1,
                  }}
                >
                  {testResult.message}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button
                onClick={() => setTestModalOpen(false)}
                disabled={testTesting}
                sx={{ color: '#94a3b8' }}
              >
                Close
              </Button>
              <Button
                variant="contained"
                onClick={handleRunTest}
                disabled={testTesting}
                sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 700 }}
              >
                {testTesting ? 'Testing...' : 'Execute Test'}
              </Button>
            </DialogActions>
          </Dialog>

        </Container>
        <Footer />
      </Box>
    </Box>
  );
};

export default SenderProfile;