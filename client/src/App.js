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

const THEME = createTheme({
  palette: {
    primary: {
      main: '#1d4ed8', // Enterprise Blue / Indigo
      light: '#3b82f6',
      dark: '#1e40af',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0284c7', // Sky / Cyan
      light: '#38bdf8',
      dark: '#0369a1',
      contrastText: '#ffffff',
    },
    success: {
      main: '#059669', // Emerald
      light: '#10b981',
      dark: '#047857',
    },
    error: {
      main: '#dc2626', // Red
      light: '#ef4444',
      dark: '#b91c1c',
    },
    warning: {
      main: '#d97706', // Amber
      light: '#f59e0b',
      dark: '#b45309',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
    },
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
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={THEME}>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/console" replace />} />
          <Route path="/console" element={<ConsoleEntry />} />
          <Route path="/training/warning" element={<TrainingWarning />} />
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
