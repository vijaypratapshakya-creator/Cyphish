import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  People as PeopleIcon,
  Assessment as ReportIcon,
  SmartToy as AIIcon,
  History as AuditIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon,
  Search as SearchIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import {
  getSystemSettings,
  updateSystemSettings,
  sendTestReport,
  testLdapConnection,
  searchDirectoryUsers,
  getSystemStats,
  getSenderProfiles,
} from '../../services/systemService';
import IntegrationsTab from '../Account/IntegrationsTab';

const Settings = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  // Settings State
  const [general, setGeneral] = useState({
    publicUrl: '',
    organizationName: 'CyPhish Security Awareness',
    trustProxy: true,
    siemLeefStdout: false,
  });

  const [ldap, setLdap] = useState({
    enabled: false,
    url: 'ldaps://ad.example.internal:636',
    bindDN: '',
    bindPassword: '',
    hasPassword: false,
    baseDN: 'DC=example,DC=internal',
    timeout: 10000,
    userFilter: '',
  });

  const [scheduledReports, setScheduledReports] = useState({
    enabled: false,
    recipients: '',
    frequency: 'weekly_monday',
    cron: '0 8 * * 1',
    senderProfile: '',
    subject: 'CyPhish Scheduled Awareness Report',
  });

  // Auxiliary data
  const [senderProfiles, setSenderProfiles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // LDAP Testing State
  const [testingLdap, setTestingLdap] = useState(false);
  const [ldapTestResult, setLdapTestResult] = useState(null);
  const [directorySearchQuery, setDirectorySearchQuery] = useState('');
  const [directorySearchResults, setDirectorySearchResults] = useState([]);
  const [searchingDirectory, setSearchingDirectory] = useState(false);

  // Report Testing State
  const [testingReport, setTestingReport] = useState(false);
  const [reportTestEmail, setReportTestEmail] = useState('');
  const [reportTestResult, setReportTestResult] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [settingsRes, profilesRes, statsRes] = await Promise.all([
        getSystemSettings(),
        getSenderProfiles().catch(() => ({ success: false, data: [] })),
        getSystemStats().catch(() => ({ success: false, data: {} })),
      ]);

      if (settingsRes?.success && settingsRes?.data) {
        const d = settingsRes.data;
        if (d.general) setGeneral(d.general);
        if (d.ldap) {
          setLdap({
            ...d.ldap,
            bindPassword: d.ldap.hasPassword ? '[UNCHANGED]' : '',
          });
        }
        if (d.scheduledReports) {
          setScheduledReports({
            ...d.scheduledReports,
            recipients: Array.isArray(d.scheduledReports.recipients)
              ? d.scheduledReports.recipients.join(', ')
              : d.scheduledReports.recipients || '',
            senderProfile: d.scheduledReports.senderProfile?._id || d.scheduledReports.senderProfile || '',
          });
        }
      }

      if (profilesRes?.data) {
        setSenderProfiles(profilesRes.data);
      }

      if (statsRes?.data?.recentAuditLogs) {
        setAuditLogs(statsRes.data.recentAuditLogs);
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to load system settings: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveGeneral = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      await updateSystemSettings({ general });
      setAlert({ type: 'success', message: 'General system settings saved successfully.' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLdap = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      const payload = {
        ldap: {
          ...ldap,
          timeout: Number(ldap.timeout) || 10000,
        },
      };
      await updateSystemSettings(payload);
      setAlert({ type: 'success', message: 'Active Directory / LDAP settings saved successfully.' });
      fetchSettings();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestLdap = async () => {
    setTestingLdap(true);
    setLdapTestResult(null);
    try {
      const res = await testLdapConnection({
        url: ldap.url,
        bindDN: ldap.bindDN,
        bindPassword: ldap.bindPassword,
        baseDN: ldap.baseDN,
        timeout: Number(ldap.timeout) || 10000,
      });
      setLdapTestResult({ success: true, message: res.message });
    } catch (err) {
      setLdapTestResult({
        success: false,
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setTestingLdap(false);
    }
  };

  const handleSearchDirectory = async () => {
    if (!directorySearchQuery.trim()) return;
    setSearchingDirectory(true);
    try {
      const res = await searchDirectoryUsers({ query: directorySearchQuery.trim() });
      if (res?.success) {
        setDirectorySearchResults(res.data || []);
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Directory search failed: ' + (err.response?.data?.message || err.message) });
    } finally {
      setSearchingDirectory(false);
    }
  };

  const handleSaveReports = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      const recipientsArray = scheduledReports.recipients
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      let cronExpression = scheduledReports.cron;
      if (scheduledReports.frequency === 'daily') cronExpression = '0 8 * * *';
      else if (scheduledReports.frequency === 'weekly_monday') cronExpression = '0 8 * * 1';
      else if (scheduledReports.frequency === 'weekly_friday') cronExpression = '0 17 * * 5';
      else if (scheduledReports.frequency === 'monthly') cronExpression = '0 8 1 * *';

      const payload = {
        scheduledReports: {
          ...scheduledReports,
          recipients: recipientsArray,
          cron: cronExpression,
        },
      };

      await updateSystemSettings(payload);
      setAlert({ type: 'success', message: 'Scheduled reports configuration saved successfully.' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestReport = async () => {
    setTestingReport(true);
    setReportTestResult(null);
    try {
      const res = await sendTestReport({
        recipientEmail: reportTestEmail || undefined,
        senderProfileId: scheduledReports.senderProfile || undefined,
      });
      setReportTestResult({ success: true, message: res.message });
    } catch (err) {
      setReportTestResult({
        success: false,
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setTestingReport(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Sidebar />

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="lg" sx={{ flexGrow: 1, mt: '96px', mb: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#0f172a',
                fontSize: { xs: '1.4rem', md: '1.8rem' },
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <SettingsIcon sx={{ color: '#2563eb', fontSize: 32 }} /> System Settings & Administration
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Manage Active Directory / LDAP synchronization, scheduled email reports, warning URLs, and SIEM logging.
            </Typography>
          </Box>

          {alert && (
            <Alert
              severity={alert.type}
              onClose={() => setAlert(null)}
              sx={{ mb: 3, borderRadius: '12px' }}
            >
              {alert.message}
            </Alert>
          )}

          {/* Navigation Tabs */}
          <Paper sx={{ borderRadius: '16px', mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <Tabs
              value={tabIndex}
              onChange={(e, val) => setTabIndex(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.9rem', py: 2 },
                '& .Mui-selected': { color: '#2563eb' },
              }}
            >
              <Tab icon={<SettingsIcon />} iconPosition="start" label="General & Public URL" />
              <Tab icon={<PeopleIcon />} iconPosition="start" label="Active Directory / LDAP" />
              <Tab icon={<ReportIcon />} iconPosition="start" label="Scheduled Reports" />
              <Tab icon={<AIIcon />} iconPosition="start" label="AI & Integrations" />
              <Tab icon={<AuditIcon />} iconPosition="start" label="Audit & SIEM Logs" />
            </Tabs>
          </Paper>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* TAB 0: GENERAL SETTINGS */}
              {tabIndex === 0 && (
                <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: '#0f172a' }}>
                      General Platform Configuration
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Configure public URLs for email tracking links, reverse proxy trust, and enterprise SIEM logging.
                    </Typography>

                    <form onSubmit={handleSaveGeneral}>
                      <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Campaign Public Warning URL"
                            value={general.publicUrl}
                            onChange={(e) => setGeneral({ ...general, publicUrl: e.target.value })}
                            placeholder="https://192.168.88.11 or https://cyphish.yourdomain.com"
                            helperText="Base HTTPS URL embedded into simulated phishing emails for click tracking and warning pages."
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Organization Name"
                            value={general.organizationName}
                            onChange={(e) => setGeneral({ ...general, organizationName: e.target.value })}
                            placeholder="Acme Financial Services"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Box sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: '12px', bgcolor: '#f8fafc' }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={general.trustProxy}
                                  onChange={(e) => setGeneral({ ...general, trustProxy: e.target.checked })}
                                  color="primary"
                                />
                              }
                              label="Trust Reverse Proxy (Nginx / Load Balancer)"
                            />
                            <Typography variant="caption" color="text.secondary" display="block">
                              Extracts real client IP addresses from X-Forwarded-For headers when running behind Nginx.
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Box sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: '12px', bgcolor: '#f8fafc' }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={general.siemLeefStdout}
                                  onChange={(e) => setGeneral({ ...general, siemLeefStdout: e.target.checked })}
                                  color="primary"
                                />
                              }
                              label="Stream SIEM Events to Container Logs (LEEF 2.0)"
                            />
                            <Typography variant="caption" color="text.secondary" display="block">
                              Outputs audit and click simulation events in RFC LEEF 2.0 format to stdout for log agents (Splunk, QRadar, Filebeat).
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <Button
                            type="submit"
                            variant="contained"
                            disabled={saving}
                            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                            sx={{
                              borderRadius: '12px',
                              px: 4,
                              py: 1.2,
                              fontWeight: 600,
                              bgcolor: '#2563eb',
                              '&:hover': { bgcolor: '#1d4ed8' },
                            }}
                          >
                            Save General Settings
                          </Button>
                        </Grid>
                      </Grid>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* TAB 1: ACTIVE DIRECTORY / LDAP */}
              {tabIndex === 1 && (
                <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <div>
                        <Typography variant="h6" fontWeight={700} sx={{ color: '#0f172a' }}>
                          Active Directory / LDAP Directory Sync
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Connect CyPhish to your corporate Active Directory or OpenLDAP server to dynamically import people, OUs, and security groups.
                        </Typography>
                      </div>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={ldap.enabled}
                            onChange={(e) => setLdap({ ...ldap, enabled: e.target.checked })}
                            color="success"
                          />
                        }
                        label={<Typography fontWeight={600}>{ldap.enabled ? 'LDAP Enabled' : 'LDAP Disabled'}</Typography>}
                      />
                    </Box>

                    {ldapTestResult && (
                      <Alert
                        severity={ldapTestResult.success ? 'success' : 'error'}
                        onClose={() => setLdapTestResult(null)}
                        sx={{ mb: 3, borderRadius: '12px' }}
                      >
                        {ldapTestResult.message}
                      </Alert>
                    )}

                    <form onSubmit={handleSaveLdap}>
                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={8}>
                          <TextField
                            fullWidth
                            label="LDAP Server URL"
                            value={ldap.url}
                            onChange={(e) => setLdap({ ...ldap, url: e.target.value })}
                            placeholder="ldaps://dc01.example.internal:636 or ldap://192.168.1.10:389"
                            helperText="Use ldaps:// for encrypted connections. Port 636 (SSL) or 389 (Plain)."
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                          />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            label="Timeout (ms)"
                            type="number"
                            value={ldap.timeout}
                            onChange={(e) => setLdap({ ...ldap, timeout: Number(e.target.value) })}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Bind DN (Service Account)"
                            value={ldap.bindDN}
                            onChange={(e) => setLdap({ ...ldap, bindDN: e.target.value })}
                            placeholder="CN=svc_cyphish,OU=Service Accounts,DC=example,DC=internal"
                            helperText="Distinguished Name of a read-only directory service account."
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Bind Password"
                            type="password"
                            value={ldap.bindPassword}
                            onChange={(e) => setLdap({ ...ldap, bindPassword: e.target.value })}
                            placeholder={ldap.hasPassword ? '•••••••• (unchanged)' : 'Enter Service Account Password'}
                            helperText={ldap.hasPassword ? 'Leave as [UNCHANGED] to keep current password.' : 'Read-only service account password.'}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Base DN (Search Root)"
                            value={ldap.baseDN}
                            onChange={(e) => setLdap({ ...ldap, baseDN: e.target.value })}
                            placeholder="DC=example,DC=internal"
                            helperText="Top-level domain component where user objects reside."
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Button
                              type="submit"
                              variant="contained"
                              disabled={saving}
                              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                              sx={{
                                borderRadius: '12px',
                                px: 3,
                                py: 1.2,
                                fontWeight: 600,
                                bgcolor: '#2563eb',
                                '&:hover': { bgcolor: '#1d4ed8' },
                              }}
                            >
                              Save LDAP Settings
                            </Button>

                            <Button
                              variant="outlined"
                              onClick={handleTestLdap}
                              disabled={testingLdap}
                              startIcon={testingLdap ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                              sx={{
                                borderRadius: '12px',
                                px: 3,
                                py: 1.2,
                                fontWeight: 600,
                                borderColor: '#059669',
                                color: '#059669',
                                '&:hover': { borderColor: '#047857', bgcolor: 'rgba(5, 150, 105, 0.04)' },
                              }}
                            >
                              {testingLdap ? 'Testing Connection...' : 'Test LDAP Connection'}
                            </Button>
                          </Box>
                        </Grid>
                      </Grid>
                    </form>

                    <Divider sx={{ my: 4 }} />

                    {/* Directory Search Preview Tool */}
                    <Box>
                      <Typography variant="h6" fontWeight={700} sx={{ color: '#0f172a', mb: 1 }}>
                        Active Directory Search & Query Preview
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Test finding users or security groups directly against the configured Active Directory server.
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Search by name, email, or sAMAccountName (e.g. 'john' or 'finance')"
                          value={directorySearchQuery}
                          onChange={(e) => setDirectorySearchQuery(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSearchDirectory()}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                        <Button
                          variant="contained"
                          onClick={handleSearchDirectory}
                          disabled={searchingDirectory}
                          startIcon={searchingDirectory ? <CircularProgress size={16} /> : <SearchIcon />}
                          sx={{ borderRadius: '12px', px: 3, bgcolor: '#334155' }}
                        >
                          Search
                        </Button>
                      </Box>

                      {directorySearchResults.length > 0 && (
                        <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', maxHeight: 320 }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell><strong>Name</strong></TableCell>
                                <TableCell><strong>Email</strong></TableCell>
                                <TableCell><strong>Department</strong></TableCell>
                                <TableCell><strong>Title / Role</strong></TableCell>
                                <TableCell><strong>Directory Groups</strong></TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {directorySearchResults.map((user, idx) => (
                                <TableRow key={idx} hover>
                                  <TableCell>{user.firstName} {user.lastName}</TableCell>
                                  <TableCell>{user.email}</TableCell>
                                  <TableCell>{user.department || '—'}</TableCell>
                                  <TableCell>{user.role || '—'}</TableCell>
                                  <TableCell>
                                    {user.directoryGroups?.length > 0 ? (
                                      <Chip size="small" label={`${user.directoryGroups.length} groups`} />
                                    ) : '—'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              )}

              {/* TAB 2: SCHEDULED REPORTS */}
              {tabIndex === 2 && (
                <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <div>
                        <Typography variant="h6" fontWeight={700} sx={{ color: '#0f172a' }}>
                          Automated Scheduled Reports
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Automatically dispatch executive awareness summaries, vulnerability trends, and click metrics to CISOs, SOC, and HR teams on a recurring schedule.
                        </Typography>
                      </div>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={scheduledReports.enabled}
                            onChange={(e) => setScheduledReports({ ...scheduledReports, enabled: e.target.checked })}
                            color="success"
                          />
                        }
                        label={<Typography fontWeight={600}>{scheduledReports.enabled ? 'Reports Active' : 'Reports Paused'}</Typography>}
                      />
                    </Box>

                    {reportTestResult && (
                      <Alert
                        severity={reportTestResult.success ? 'success' : 'error'}
                        onClose={() => setReportTestResult(null)}
                        sx={{ mb: 3, borderRadius: '12px' }}
                      >
                        {reportTestResult.message}
                      </Alert>
                    )}

                    <form onSubmit={handleSaveReports}>
                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                            <InputLabel>Delivery Frequency</InputLabel>
                            <Select
                              value={scheduledReports.frequency}
                              label="Delivery Frequency"
                              onChange={(e) => setScheduledReports({ ...scheduledReports, frequency: e.target.value })}
                            >
                              <MenuItem value="daily">Daily at 08:00 AM</MenuItem>
                              <MenuItem value="weekly_monday">Weekly on Mondays (08:00 AM)</MenuItem>
                              <MenuItem value="weekly_friday">Weekly on Fridays (05:00 PM)</MenuItem>
                              <MenuItem value="monthly">Monthly (1st day of month)</MenuItem>
                              <MenuItem value="custom">Custom Cron Expression</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}>
                            <InputLabel>Dispatch SMTP Sender Profile</InputLabel>
                            <Select
                              value={scheduledReports.senderProfile}
                              label="Dispatch SMTP Sender Profile"
                              onChange={(e) => setScheduledReports({ ...scheduledReports, senderProfile: e.target.value })}
                            >
                              {senderProfiles.map((p) => (
                                <MenuItem key={p._id} value={p._id}>
                                  {p.senderName} ({p.email}) - {p.host}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        {scheduledReports.frequency === 'custom' && (
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Custom Cron Expression"
                              value={scheduledReports.cron}
                              onChange={(e) => setScheduledReports({ ...scheduledReports, cron: e.target.value })}
                              placeholder="0 8 * * 1"
                              helperText="Standard 5-field cron expression: (minute hour day-of-month month day-of-week)"
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                          </Grid>
                        )}

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Recipient Email Addresses"
                            value={scheduledReports.recipients}
                            onChange={(e) => setScheduledReports({ ...scheduledReports, recipients: e.target.value })}
                            placeholder="ciso@company.com, soc@company.com, hr-training@company.com"
                            helperText="Comma-separated list of recipient email addresses who will receive the summary report."
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Email Subject Line"
                            value={scheduledReports.subject}
                            onChange={(e) => setScheduledReports({ ...scheduledReports, subject: e.target.value })}
                            placeholder="CyPhish Scheduled Awareness Report"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <Button
                            type="submit"
                            variant="contained"
                            disabled={saving}
                            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                            sx={{
                              borderRadius: '12px',
                              px: 4,
                              py: 1.2,
                              fontWeight: 600,
                              bgcolor: '#2563eb',
                              '&:hover': { bgcolor: '#1d4ed8' },
                            }}
                          >
                            Save Report Settings
                          </Button>
                        </Grid>
                      </Grid>
                    </form>

                    <Divider sx={{ my: 4 }} />

                    {/* Instant Test Dispatch Tool */}
                    <Box sx={{ p: 3, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0f172a', mb: 1 }}>
                        🚀 Send Instant Test Report
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Trigger an immediate test report to your email inbox right now to verify SMTP deliverability and formatting.
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <TextField
                          size="small"
                          label="Test Recipient Email (optional override)"
                          value={reportTestEmail}
                          onChange={(e) => setReportTestEmail(e.target.value)}
                          placeholder="your-email@company.com"
                          sx={{ minWidth: 320, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                        <Button
                          variant="contained"
                          onClick={handleSendTestReport}
                          disabled={testingReport || !scheduledReports.senderProfile}
                          startIcon={testingReport ? <CircularProgress size={16} /> : <SendIcon />}
                          sx={{
                            borderRadius: '12px',
                            px: 3,
                            bgcolor: '#059669',
                            fontWeight: 600,
                            '&:hover': { bgcolor: '#047857' },
                          }}
                        >
                          {testingReport ? 'Dispatching Test...' : 'Send Test Report Now'}
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}

              {/* TAB 3: AI & INTEGRATIONS */}
              {tabIndex === 3 && (
                <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: '#0f172a' }}>
                      AI & LLM Model Integrations (Ollama, OpenAI, Gemini)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Configure local or cloud AI models (such as Ollama on private infrastructure) for template generation and scenario drafting.
                    </Typography>
                    <IntegrationsTab />
                  </CardContent>
                </Card>
              )}

              {/* TAB 4: AUDIT & SIEM LOGS */}
              {tabIndex === 4 && (
                <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <div>
                        <Typography variant="h6" fontWeight={700} sx={{ color: '#0f172a' }}>
                          Administrative Audit Trail & SIEM Events
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Persistent log of all administrative modifications, campaign launches, approvals, and security settings changes.
                        </Typography>
                      </div>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={fetchSettings}
                        startIcon={<RefreshIcon />}
                        sx={{ borderRadius: '10px' }}
                      >
                        Refresh Logs
                      </Button>
                    </Box>

                    {auditLogs.length === 0 ? (
                      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                        No audit events recorded yet.
                      </Typography>
                    ) : (
                      <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                              <TableCell><strong>Timestamp</strong></TableCell>
                              <TableCell><strong>Action</strong></TableCell>
                              <TableCell><strong>Actor</strong></TableCell>
                              <TableCell><strong>Resource</strong></TableCell>
                              <TableCell><strong>Source IP</strong></TableCell>
                              <TableCell><strong>Outcome</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {auditLogs.map((log) => (
                              <TableRow key={log._id} hover>
                                <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                  {new Date(log.createdAt).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Chip size="small" label={log.action} variant="outlined" sx={{ fontWeight: 600 }} />
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.85rem' }}>
                                  {log.actor?.username || log.actor?.email || 'System'}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.85rem' }}>
                                  {log.resourceType} {log.resourceId ? `(${log.resourceId.slice(0, 8)}...)` : ''}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.85rem' }}>
                                  {log.sourceIp || '—'}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={log.outcome}
                                    color={log.outcome === 'success' ? 'success' : 'error'}
                                    sx={{ textTransform: 'capitalize', fontWeight: 600, height: 22 }}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </Container>
        <Footer />
      </Box>
    </Box>
  );
};

export default Settings;
