import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, Paper, Typography } from '@mui/material';
import logo from '../../assets/img/cyphish-logo.png';
import { logClick } from '../../services/MSPortalService';

const TrainingWarning = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState('loading');

  useEffect(() => {
    const trackingId = searchParams.get('id');
    if (!trackingId || !/^[a-zA-Z0-9]{8,64}$/.test(trackingId)) {
      setState('invalid');
      return;
    }
    logClick(trackingId).then((result) => setState(result.success ? 'ready' : 'invalid'));
  }, [searchParams]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#f4f7f6', p: 2 }}>
      <Paper elevation={2} sx={{ width: '100%', maxWidth: 620, p: { xs: 3, sm: 5 }, borderRadius: 3, textAlign: 'center' }}>
        <Box component="img" src={logo} alt="CyPhish" sx={{ width: 260, maxWidth: '100%', mb: 4 }} />
        {state === 'loading' && <CircularProgress aria-label="Loading awareness notice" />}
        {state === 'ready' && <>
          <Alert severity="warning" sx={{ textAlign: 'left', mb: 3 }}>This was an authorized security-awareness simulation.</Alert>
          <Typography variant="h4" fontWeight={700} gutterBottom>You spotted a phishing simulation</Typography>
          <Typography color="text.secondary">This link was part of your organization’s CyPhish awareness training. No password or other credential has been requested or recorded.</Typography>
          <Typography sx={{ mt: 3 }} color="text.secondary">When in doubt, verify unexpected requests through a trusted channel and report suspicious messages to your security team.</Typography>
        </>}
        {state === 'invalid' && <Alert severity="info">This training link is invalid, expired, or no longer active.</Alert>}
      </Paper>
    </Box>
  );
};

export default TrainingWarning;
