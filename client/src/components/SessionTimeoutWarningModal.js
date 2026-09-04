import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  LockOutlined as LockOutlinedIcon,
} from '@mui/icons-material';

const SessionTimeoutWarningModal = ({ open, secondsRemaining, onStayLoggedIn, onLogout }) => {
  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          bgcolor: '#111827',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
          maxWidth: '450px',
          p: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <AccessTimeIcon sx={{ color: '#f59e0b', fontSize: '1.8rem' }} />
        <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700 }}>
          Session Inactivity Warning
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ py: 2 }}>
        <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
          For security compliance, your administrator session will automatically terminate due to inactivity.
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#0b0f19',
            p: 3,
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            gap: 2,
          }}
        >
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress
              variant="determinate"
              value={(secondsRemaining / 60) * 100}
              size={54}
              thickness={4}
              sx={{ color: secondsRemaining <= 15 ? '#ef4444' : '#f59e0b' }}
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#f8fafc' }}>
                {secondsRemaining}s
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 700 }}>
              Auto-Logout in {secondsRemaining} seconds
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Click below to maintain your active console session.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          variant="outlined"
          color="error"
          onClick={onLogout}
          startIcon={<LockOutlinedIcon />}
          sx={{ borderColor: 'rgba(239, 68, 68, 0.4)', textTransform: 'none', fontWeight: 600 }}
        >
          Sign Out Now
        </Button>
        <Button
          variant="contained"
          onClick={onStayLoggedIn}
          sx={{
            bgcolor: '#3b82f6',
            color: '#fff',
            fontWeight: 700,
            textTransform: 'none',
            px: 3,
            '&:hover': { bgcolor: '#2563eb' },
          }}
        >
          Stay Logged In
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionTimeoutWarningModal;
