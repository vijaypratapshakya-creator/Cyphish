import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  ShieldAlert as ShieldAlertIcon,
  WarningAmber as WarningIcon,
  CheckCircleOutline as CheckIcon,
  MarkEmailRead as EmailIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import logo from '../../assets/img/cyphish-logo.png';
import { logClick } from '../../services/MSPortalService';

const TrainingWarning = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState('loading');

  useEffect(() => {
    const trackingId = searchParams.get('id');
    if (!trackingId || !/^[a-zA-Z0-9_-]{4,64}$/.test(trackingId)) {
      setState('invalid');
      return;
    }
    logClick(trackingId)
      .then((result) => setState(result.success ? 'ready' : 'invalid'))
      .catch(() => setState('ready')); // Fallback to ready display even if tracking failed
  }, [searchParams]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f172a', p: 3 }}>
      <Paper
        elevation={6}
        sx={{
          width: '100%',
          maxWidth: 780,
          p: { xs: 3, sm: 5 },
          borderRadius: '24px',
          bgcolor: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box component="img" src={logo} alt="CyPhish" sx={{ height: 36, maxWidth: '100%' }} />
          <Chip
            label="Internal Simulation Drill"
            sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: '0.75rem' }}
          />
        </Box>

        {state === 'loading' && (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <CircularProgress size={48} sx={{ color: '#2563eb' }} />
            <Typography variant="body1" sx={{ mt: 2, color: '#64748b' }}>
              Verifying simulation event...
            </Typography>
          </Box>
        )}

        {state === 'ready' && (
          <>
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Box sx={{ display: 'inline-flex', p: 2, bgcolor: '#fef2f2', borderRadius: '50%', mb: 2 }}>
                <WarningIcon sx={{ fontSize: 44, color: '#dc2626' }} />
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#0f172a', fontSize: { xs: '1.4rem', sm: '1.8rem' } }}>
                Oops! You clicked a simulated phishing link.
              </Typography>
              <Typography variant="body1" sx={{ color: '#475569', mt: 1, maxWidth: 620, mx: 'auto' }}>
                Don't panic! This was an authorized internal security awareness drill conducted by your organization. <strong>No real credentials or sensitive data were collected.</strong>
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Teachable Moment - Spot the Red Flags */}
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0f172a', mb: 2 }}>
              🚩 Key Red Flags to Look Out For in Phishing Emails:
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Card sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', height: '100%' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="#dc2626" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      1. Mismatched Sender Domain
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.82rem' }}>
                      Always verify the exact sender email address (e.g. <code>security@paypa1-support.com</code> instead of official corporate domains).
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Card sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', height: '100%' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="#dc2626" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      2. Artificial Urgency & Coercion
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.82rem' }}>
                      Attackers pressure you with tight deadlines like "Your account will be suspended within 2 hours" to bypass critical thinking.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Card sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', height: '100%' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="#dc2626" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      3. Suspicious Hyperlink Destination
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.82rem' }}>
                      Hover over any button or link before clicking to preview the real destination URL in your email client status bar.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Card sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', height: '100%' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="#dc2626" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      4. Unexpected Password / Action Request
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.82rem' }}>
                      Legitimate IT departments never ask you to verify your credentials or financial info via unsolicited links.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Box sx={{ p: 2.5, bgcolor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#166534" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckIcon sx={{ fontSize: 20 }} /> Next Steps & Security Protocol
              </Typography>
              <Typography variant="body2" color="#166534" sx={{ mt: 0.5, fontSize: '0.84rem' }}>
                Your security and HR team have logged this simulation event for awareness metrics. If follow-up training is required, you will receive an assignment from your HR learning portal. When in doubt, always report suspicious messages using your email client's report button!
              </Typography>
            </Box>
          </>
        )}

        {state === 'invalid' && (
          <Alert severity="info" sx={{ borderRadius: '12px', my: 3 }}>
            This training link is invalid, expired, or no longer active.
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default TrainingWarning;
