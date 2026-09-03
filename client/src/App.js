import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ProtectedRoute from './components/ProtectedRoute';
import ConsoleEntry from './components/ConsoleEntry';
import './App.css';

import TrainingWarning from './pages/TrainingWarning';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';

import Audience from './pages/Audience';
import CreateAudience from './pages/Audience/CreateAudience';
import AudienceDetail from './pages/Audience/AudienceDetail';

import SenderProfile from './pages/SenderProfile';
import CreateSenderProfile from './pages/SenderProfile/CreateSenderProfile';

import Templates from './pages/Templates';
import TemplateComposer from './pages/Templates/TemplateComposer';

import Campaign from './pages/Campaign';
import StartCampaign from './pages/Campaign/StartCampaign';
import CampaignDetail from './pages/Campaign/CampaignDetail';

import Settings from './pages/Settings';
import Account from './pages/Account';

import NotFoundPage from './pages/NotFound';

// Cyber Command & SOC Ops Theme (Full Dark Mode)
const CYBER_COMMAND_THEME = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6', // Electric Cobalt
      light: '#60a5fa',
      dark: '#1d4ed8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#06b6d4', // Cyber Cyan
      light: '#22d3ee',
      dark: '#0891b2',
      contrastText: '#ffffff',
    },
    success: {
      main: '#10b981', // Cyber Emerald
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ef4444', // Threat Red
      light: '#f87171',
      dark: '#dc2626',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#f59e0b', // Telemetry Amber
      light: '#fbbf24',
      dark: '#d97706',
      contrastText: '#000000',
    },
    background: {
      default: '#0b0f19', // Deep Midnight Command Slate
      paper: '#111827',   // Dark Surface Slate
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: '"Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 13,
    fontWeightLight: 400,
    fontWeightRegular: 500,
    fontWeightMedium: 500,
    fontWeightSemiBold: 600,
    fontWeightBold: 700,
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '10px',
          boxShadow: 'none',
          fontWeight: 600,
          '&:hover': {
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#111827',
          border: '1px solid rgba(255, 255, 255, 0.07)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          backgroundColor: '#111827',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          color: '#e2e8f0',
        },
        head: {
          fontWeight: 700,
          color: '#94a3b8',
          backgroundColor: '#0f172a',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#0b0f19',
          borderRadius: '10px',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.12)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3b82f6',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3b82f6',
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.2)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={CYBER_COMMAND_THEME}>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/console" replace />} />
          <Route path="/console" element={<ConsoleEntry />} />
          <Route path="/training/warning" element={<TrainingWarning />} />
          <Route path="/training/report" element={<TrainingWarning />} />
          <Route path="/account/signin" element={<Navigate to="/training/warning" replace />} />
          
          <Route path="/console/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/console/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />

          <Route path="/console/audience" element={<ProtectedRoute><Audience /></ProtectedRoute>} />
          <Route path="/console/audience/create" element={<ProtectedRoute><CreateAudience /></ProtectedRoute>} />
          <Route path="/console/audience/:id" element={<ProtectedRoute><AudienceDetail /></ProtectedRoute>} />

          <Route path="/console/sender-profile" element={<ProtectedRoute><SenderProfile /></ProtectedRoute>} />
          <Route path="/console/sender-profile/create" element={<ProtectedRoute><CreateSenderProfile /></ProtectedRoute>} />

          <Route path="/console/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
          <Route path="/console/templates/new" element={<ProtectedRoute><TemplateComposer /></ProtectedRoute>} />
          <Route path="/console/templates/:id/edit" element={<ProtectedRoute><TemplateComposer /></ProtectedRoute>} />

          <Route path="/console/campaign" element={<ProtectedRoute><Campaign /></ProtectedRoute>} />
          <Route path="/console/campaign/create" element={<ProtectedRoute><StartCampaign /></ProtectedRoute>} />
          <Route path="/console/campaign/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />

          <Route path="/console/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/console/account/*" element={<ProtectedRoute><Account /></ProtectedRoute>} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
