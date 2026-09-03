import React, { useEffect, useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
} from '@mui/material';
import {
  WarningAmber as WarningIcon,
  CheckCircleOutline as CheckIcon,
  Shield as ShieldIcon,
  VerifiedUser as VerifiedUserIcon,
} from '@mui/icons-material';
import logo from '../../assets/img/cyphish-logo.png';
import { logClick, reportPhishing } from '../../services/MSPortalService';
import { getLandingConfig } from '../../services/systemService';

const TrainingWarning = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [state, setState] = useState('loading');
  const [landingConfig, setLandingConfig] = useState(null);

  const isReportMode = location.pathname.includes('/report') || searchParams.get('action') === 'report';

  useEffect(() => {
    // Fetch custom landing page and teachable moment configuration
    getLandingConfig()
      .then((res) => {
        if (res.success && res.data) {
          setLandingConfig(res.data);
        }
      })
      .catch((err) => console.warn('Could not fetch custom landing config:', err.message));

    const trackingId = searchParams.get('id');
    if (!trackingId || !/^[a-zA-Z0-9_-]{4,64}$/.test(trackingId)) {
      setState('invalid');
      return;
    }

    if (isReportMode) {
      reportPhishing(trackingId)
        .then(() => setState('ready'))
        .catch(() => setState('ready'));
    } else {
      logClick(trackingId)
        .then((result) => setState(result.success ? 'ready' : 'invalid'))
        .catch(() => setState('ready'));
    }
  }, [searchParams, isReportMode]);

  const defaultRedFlags = [
    { title: '1. Mismatched Sender Domain', description: 'Always verify the sender email address instead of just looking at the display name.' },
    { title: '2. Artificial Urgency & Coercion', description: 'Attackers pressure you with tight deadlines like "Your account will be suspended within 2 hours" to bypass rational thought.' },
    { title: '3. Suspicious Hyperlinks', description: 'Hover over links before clicking to preview the real destination URL in your email client status bar.' },
    { title: '4. Unexpected Action Requests', description: 'Legitimate IT teams never ask you to verify passwords or sensitive data via unsolicited links.' },
  ];

  const redFlags = landingConfig?.redFlags && landingConfig.redFlags.length > 0 ? landingConfig.redFlags : defaultRedFlags;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0b0f19', p: 3 }}>
      <Paper
        elevation={6}
        sx={{
          width: '100%',
          maxWidth: 780,
          p: { xs: 3, sm: 5 },
          borderRadius: '24px',
          bgcolor: '#111827',
          border: isReportMode ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: isReportMode ? '0 25px 50px -12px rgba(16, 185, 129, 0.15)' : '0 25px 50px -12px rgba(239, 68, 68, 0.15)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box component="img" src={logo} alt={landingConfig?.organizationName || 'CyPhish'} sx={{ height: 36, maxWidth: '100%' }} />
          <Chip
            label={isReportMode ? '🌟 Positive Security Event' : 'Internal Simulation Drill'}
            sx={{
              bgcolor: isReportMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isReportMode ? '#34d399' : '#f87171',
              fontWeight: 700,
              fontSize: '0.75rem',
              border: isReportMode ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
            }}
          />
        </Box>

        {state === 'loading' && (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <CircularProgress size={48} sx={{ color: isReportMode ? '#10b981' : '#3b82f6' }} />
            <Typography variant="body1" sx={{ mt: 2, color: '#94a3b8' }}>
              {isReportMode ? 'Recording phishing report...' : 'Verifying simulation event...'}
            </Typography>
          </Box>
        )}

        {state === 'ready' && isReportMode && (
          <>
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Box sx={{ display: 'inline-flex', p: 2, bgcolor: 'rgba(16, 185, 129, 0.12)', borderRadius: '50%', mb: 2 }}>
                <VerifiedUserIcon sx={{ fontSize: 48, color: '#10b981' }} />
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#f8fafc', fontSize: { xs: '1.4rem', sm: '1.8rem' } }}>
                {landingConfig?.reportSuccessTitle || '🎉 Outstanding Job! You Reported a Phishing Simulation.'}
              </Typography>
              <Typography variant="body1" sx={{ color: '#94a3b8', mt: 1, maxWidth: 620, mx: 'auto' }}>
                {landingConfig?.reportSuccessMessage || 'You correctly identified an authorized security drill and reported it. Your proactive vigilance protects our entire organization from real-world cyber attacks!'}
              </Typography>
            </Box>

            <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            <Box sx={{ p: 3, bgcolor: 'rgba(16, 185, 129, 0.08)', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.25)', mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ShieldIcon sx={{ fontSize: 22 }} /> Security Champion Status Credited
              </Typography>
              <Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.88rem' }}>
                Your report has been logged and credited toward {landingConfig?.organizationName || 'your organization'}'s <strong>Security Awareness Score</strong>. Keep up the fantastic work!
              </Typography>
            </Box>
          </>
        )}

        {state === 'ready' && !isReportMode && (
          <>
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Box sx={{ display: 'inline-flex', p: 2, bgcolor: 'rgba(239, 68, 68, 0.12)', borderRadius: '50%', mb: 2 }}>
                <WarningIcon sx={{ fontSize: 48, color: '#ef4444' }} />
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#f8fafc', fontSize: { xs: '1.4rem', sm: '1.8rem' } }}>
                {landingConfig?.warningTitle || 'Oops! You clicked a simulated phishing link.'}
              </Typography>
              <Typography variant="body1" sx={{ color: '#94a3b8', mt: 1, maxWidth: 620, mx: 'auto' }}>
                {landingConfig?.warningMessage || "Don't panic! This was an authorized internal security awareness drill conducted by your organization. No real credentials or sensitive data were collected."}
              </Typography>
            </Box>

            <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            {/* Teachable Moment */}
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#f8fafc', mb: 2 }}>
              🚩 Key Red Flags to Spot in Phishing Emails:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {redFlags.map((flag, idx) => (
                <Grid item xs={12} sm={6} key={idx}>
                  <Card sx={{ bgcolor: '#0b0f19', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', height: '100%' }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} color="#f87171" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {flag.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5, fontSize: '0.82rem' }}>
                        {flag.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ p: 2.5, bgcolor: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.25)', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#34d399" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckIcon sx={{ fontSize: 20 }} /> Next Steps & Security Protocol
              </Typography>
              <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 0.5, fontSize: '0.84rem' }}>
                {landingConfig?.nextStepsMessage || 'Your security team has logged this drill for awareness tracking. Next time you see a suspicious email, always use the Report Phishing link or forward it to your SOC / IT Security desk!'}
              </Typography>
            </Box>
          </>
        )}

        {state === 'invalid' && (
          <Alert severity="info" sx={{ borderRadius: '12px', my: 3, bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            This training drill link is invalid, expired, or no longer active.
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default TrainingWarning;
