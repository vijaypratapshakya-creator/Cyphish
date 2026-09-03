import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Add as AddIcon,
} from '@mui/icons-material';

import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import {
  getSystemSettings,
  updateSystemSettings,
  testLdapConnection,
  getSystemStats,
  getSenderProfiles,
  testSiemForwarding,
  triggerRetentionCleanup,
  getUsers,
  createUser,
  toggleLockUser,
  deleteUser,
} from '../../services/systemService';

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
    logRetentionDays: 180,
  });

  const [landingPage, setLandingPage] = useState({
    warningTitle: 'Oops! You clicked a simulated phishing link.',
    warningMessage: "Don't panic! This was an authorized internal security awareness drill conducted by your organization. No real credentials or sensitive data were collected.",
    nextStepsMessage: 'Your security team has logged this drill for awareness tracking. Next time you see a suspicious email, always use the Report Phishing link or forward it to your SOC / IT Security desk!',
    reportSuccessTitle: '🎉 Outstanding Job! You Reported a Phishing Simulation.',
    reportSuccessMessage: 'You correctly identified an authorized security drill and reported it. Your proactive vigilance protects our entire organization from real-world cyber attacks!',
    redFlags: [
      { title: '1. Mismatched Sender Domain', description: 'Always verify the sender email address instead of just looking at the display name.' },
      { title: '2. Artificial Urgency & Coercion', description: 'Attackers pressure you with tight deadlines like "Your account will be suspended within 2 hours" to bypass rational thought.' },
      { title: '3. Suspicious Hyperlink Destination', description: 'Hover over links before clicking to preview the real destination URL in your email client status bar.' },
      { title: '4. Unexpected Password / Action Request', description: 'Legitimate IT teams never ask you to verify passwords via unsolicited links.' },
    ],
  });

  const [siem, setSiem] = useState({
    enabled: false,
    host: '',
    port: 514,
    protocol: 'UDP',
    format: 'LEEF_2.0',
    facility: 'local0',
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

  // User Management State
  const [usersList, setUsersList] = useState([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    role: 'campaign_manager',
  });
  const [userCreating, setUserCreating] = useState(false);

  // SIEM & Retention Test State
  const [testingSiem, setTestingSiem] = useState(false);
  const [siemTestResult, setSiemTestResult] = useState(null);
  const [purgingRetention, setPurgingRetention] = useState(false);

  // LDAP Testing State
  const [testingLdap, setTestingLdap] = useState(false);
  const [ldapTestResult, setLdapTestResult] = useState(null);

  // Auxiliary data
  const [senderProfiles, setSenderProfiles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    loadSettings();
    loadUsers();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [settingsRes, statsRes, profilesRes] = await Promise.all([
        getSystemSettings(),
        getSystemStats(),
        getSenderProfiles(),
      ]);

      if (settingsRes.success && settingsRes.data) {
        const d = settingsRes.data;
        if (d.general) {
          setGeneral({
            publicUrl: d.general.publicUrl || '',
            organizationName: d.general.organizationName || 'CyPhish Security Awareness',
            trustProxy: d.general.trustProxy ?? true,
            logRetentionDays: d.general.logRetentionDays || 180,
          });
        }
        if (d.landingPage) {
          setLandingPage({
            warningTitle: d.landingPage.warningTitle || 'Oops! You clicked a simulated phishing link.',
            warningMessage: d.landingPage.warningMessage || "Don't panic! This was an authorized internal security awareness drill conducted by your organization. No real credentials or sensitive data were collected.",
            nextStepsMessage: d.landingPage.nextStepsMessage || 'Your security team has logged this drill for awareness tracking. Next time you see a suspicious email, always use the Report Phishing link or forward it to your SOC / IT Security desk!',
            reportSuccessTitle: d.landingPage.reportSuccessTitle || '🎉 Outstanding Job! You Reported a Phishing Simulation.',
            reportSuccessMessage: d.landingPage.reportSuccessMessage || 'You correctly identified an authorized security drill and reported it. Your proactive vigilance protects our entire organization from real-world cyber attacks!',
            redFlags: d.landingPage.redFlags && d.landingPage.redFlags.length > 0 ? d.landingPage.redFlags : [
              { title: '1. Mismatched Sender Domain', description: 'Always verify the sender email address instead of just looking at the display name.' },
              { title: '2. Artificial Urgency & Coercion', description: 'Attackers pressure you with tight deadlines like "Your account will be suspended within 2 hours" to bypass rational thought.' },
              { title: '3. Suspicious Hyperlink Destination', description: 'Hover over links before clicking to preview the real destination URL in your email client status bar.' },
              { title: '4. Unexpected Password / Action Request', description: 'Legitimate IT teams never ask you to verify passwords via unsolicited links.' },
            ],
          });
        }
        if (d.siem) {
          setSiem({
            enabled: d.siem.enabled ?? false,
            host: d.siem.host || '',
            port: d.siem.port || 514,
            protocol: d.siem.protocol || 'UDP',
            format: d.siem.format || 'LEEF_2.0',
            facility: d.siem.facility || 'local0',
          });
        }
        if (d.ldap) {
          setLdap({
            enabled: d.ldap.enabled ?? false,
            url: d.ldap.url || 'ldaps://ad.example.internal:636',
            bindDN: d.ldap.bindDN || '',
            bindPassword: '',
            hasPassword: d.ldap.hasPassword || false,
            baseDN: d.ldap.baseDN || 'DC=example,DC=internal',
            timeout: d.ldap.timeout || 10000,
            userFilter: d.ldap.userFilter || '',
          });
        }
        if (d.scheduledReports) {
          setScheduledReports({
            enabled: d.scheduledReports.enabled ?? false,
            recipients: Array.isArray(d.scheduledReports.recipients)
              ? d.scheduledReports.recipients.join(', ')
              : d.scheduledReports.recipients || '',
            frequency: d.scheduledReports.frequency || 'weekly_monday',
            cron: d.scheduledReports.cron || '0 8 * * 1',
            senderProfile: d.scheduledReports.senderProfile?._id || d.scheduledReports.senderProfile || '',
            subject: d.scheduledReports.subject || 'CyPhish Scheduled Awareness Report',
          });
        }
      }

      if (statsRes.success && statsRes.data) {
        setAuditLogs(statsRes.data.recentAuditLogs || []);
      }

      if (profilesRes.success && profilesRes.data) {
        setSenderProfiles(profilesRes.data || []);
      }
    } catch (err) {
      setAlert({ severity: 'error', message: err.message || 'Failed to load system settings' });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await getUsers();
      if (res.success) {
        setUsersList(res.data || []);
      }
    } catch (err) {
      console.warn('User load warning:', err.message);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setAlert(null);

      const payload = {
        general,
        landingPage,
        siem,
        ldap: {
          ...ldap,
          bindPassword: ldap.bindPassword ? ldap.bindPassword : '[UNCHANGED]',
        },
        scheduledReports: {
          ...scheduledReports,
          recipients: scheduledReports.recipients
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean),
        },
      };

      const res = await updateSystemSettings(payload);
      if (res.success) {
        setAlert({ severity: 'success', message: 'System settings, custom landing page, and SIEM configs updated successfully.' });
      }
    } catch (err) {
      setAlert({ severity: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAddRedFlag = () => {
    setLandingPage({
      ...landingPage,
      redFlags: [
        ...landingPage.redFlags,
        { title: `Red Flag ${landingPage.redFlags.length + 1}`, description: 'Description of the suspicious indicator.' },
      ],
    });
  };

  const handleUpdateRedFlag = (index, field, value) => {
    const updated = [...landingPage.redFlags];
    updated[index] = { ...updated[index], [field]: value };
    setLandingPage({ ...landingPage, redFlags: updated });
  };

  const handleRemoveRedFlag = (index) => {
    const updated = landingPage.redFlags.filter((_, i) => i !== index);
    setLandingPage({ ...landingPage, redFlags: updated });
  };

  const handleTestSiem = async () => {
    if (!siem.host) {
      setSiemTestResult({ success: false, message: 'Please enter SIEM Host/IP before testing.' });
      return;
    }
    setTestingSiem(true);
    setSiemTestResult(null);
    try {
      const res = await testSiemForwarding(siem);
      setSiemTestResult(res);
    } catch (err) {
      setSiemTestResult({ success: false, message: err.response?.data?.message || err.message });
    } finally {
      setTestingSiem(false);
    }
  };

  const handlePurgeRetention = async () => {
    setPurgingRetention(true);
    try {
      const res = await triggerRetentionCleanup();
      setAlert({
        severity: 'success',
        message: `Retention purge executed: ${res.data?.purged?.auditEvents || 0} audit logs, ${res.data?.purged?.campaignTracking || 0} drill records purged.`,
      });
    } catch (err) {
      setAlert({ severity: 'error', message: err.message });
    } finally {
      setPurgingRetention(false);
    }
  };

  const handleTestLdap = async () => {
    setTestingLdap(true);
    setLdapTestResult(null);
    try {
      const res = await testLdapConnection({
        ...ldap,
        bindPassword: ldap.bindPassword ? ldap.bindPassword : '[UNCHANGED]',
      });
      setLdapTestResult(res);
    } catch (err) {
      setLdapTestResult({ success: false, message: err.response?.data?.message || err.message });
    } finally {
      setTestingLdap(false);
    }
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    setUserCreating(true);
    try {
      const res = await createUser(newUserData);
      if (res.success) {
        setUserModalOpen(false);
        setNewUserData({ firstName: '', lastName: '', username: '', email: '', password: '', role: 'campaign_manager' });
        loadUsers();
        setAlert({ severity: 'success', message: res.message });
      }
    } catch (err) {
      setAlert({ severity: 'error', message: err.response?.data?.error || err.message });
    } finally {
      setUserCreating(false);
    }
  };

  const handleToggleLock = async (id) => {
    try {
      const res = await toggleLockUser(id);
      if (res.success) {
        loadUsers();
      }
    } catch (err) {
      setAlert({ severity: 'error', message: err.response?.data?.error || err.message });
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      const res = await deleteUser(id);
      if (res.success) {
        loadUsers();
        setAlert({ severity: 'success', message: res.message });
      }
    } catch (err) {
      setAlert({ severity: 'error', message: err.response?.data?.error || err.message });
    }
  };

  const getRoleChip = (role) => {
    switch (role) {
      case 'admin':
        return <Chip size="small" label="👑 Main Admin" sx={{ bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 700, border: '1px solid rgba(59, 130, 246, 0.4)' }} />;
      case 'campaign_manager':
        return <Chip size="small" label="🛠️ Security Engineer" sx={{ bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.4)' }} />;
      default:
        return <Chip size="small" label="👁️ Auditor / Viewer" sx={{ bgcolor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.4)' }} />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0b0f19', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress sx={{ color: '#3b82f6' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0b0f19' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="xl" sx={{ flexGrow: 1, mt: '80px', mb: 4, px: { xs: 2, sm: 3 } }}>
          
          {/* Top Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f8fafc', fontSize: { xs: '1.4rem', md: '1.8rem' }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <SettingsIcon sx={{ color: '#3b82f6', fontSize: '2rem' }} />
                System Administration & RBAC Portal
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                Configure delegated engineer roles, customized landing pages, SIEM network syslog, and 180-day retention.
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveAll}
              disabled={saving}
              sx={{
                bgcolor: '#3b82f6',
                color: '#fff',
                fontWeight: 700,
                px: 3,
                py: 1.2,
                borderRadius: '10px',
                '&:hover': { bgcolor: '#2563eb' },
              }}
            >
              {saving ? 'Saving System Changes...' : 'Save All Settings'}
            </Button>
          </Box>

          {alert && (
            <Alert
              severity={alert.severity}
              onClose={() => setAlert(null)}
              sx={{
                mb: 3,
                bgcolor: alert.severity === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: alert.severity === 'success' ? '#34d399' : '#f87171',
                border: alert.severity === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              {alert.message}
            </Alert>
          )}

          {/* Settings Tabs */}
          <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
            <Box sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', px: 3, pt: 2 }}>
              <Tabs
                value={tabIndex}
                onChange={(e, val) => setTabIndex(val)}
                sx={{
                  '& .MuiTab-root': {
                    color: '#94a3b8',
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    minHeight: 44,
                    '&.Mui-selected': { color: '#60a5fa' },
                  },
                  '& .MuiTabs-indicator': { bgcolor: '#3b82f6', height: 3 },
                }}
              >
                <Tab label={`👥 Users & RBAC (${usersList.length})`} />
                <Tab label="🎯 Landing Page & Warning Customizer" />
                <Tab label="🛡️ SIEM & Syslog Forwarder" />
                <Tab label="⚙️ General & 180d Retention" />
                <Tab label="🗂️ Active Directory / LDAP" />
                <Tab label="📊 Automated Reports" />
                <Tab label="📜 Audit Trail" />
              </Tabs>
            </Box>

            <CardContent sx={{ p: 4 }}>
              
              {/* Tab 0: Users & RBAC */}
              {tabIndex === 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                        Delegated Administrator & Engineer Accounts
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                        Super Administrator is provisioned during startup. Create and manage delegated Security Engineers and Auditors below.
                      </Typography>
                    </Box>

                    <Button
                      variant="contained"
                      startIcon={<PersonAddIcon />}
                      onClick={() => setUserModalOpen(true)}
                      sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 700, borderRadius: '10px' }}
                    >
                      Add Platform User
                    </Button>
                  </Box>

                  <TableContainer sx={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>User</TableCell>
                          <TableCell>Username</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell align="center">Role</TableCell>
                          <TableCell align="center">Account Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {usersList.map((u) => (
                          <TableRow key={u._id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                            <TableCell sx={{ fontWeight: 600, color: '#f8fafc' }}>
                              {u.firstName} {u.lastName || ''} {u.isRoot && <Chip size="small" label="ROOT" sx={{ bgcolor: 'rgba(59, 130, 246, 0.3)', color: '#93c5fd', fontSize: '0.65rem', ml: 1 }} />}
                            </TableCell>
                            <TableCell sx={{ color: '#94a3b8', fontFamily: 'monospace' }}>{u.username}</TableCell>
                            <TableCell sx={{ color: '#cbd5e1' }}>{u.email}</TableCell>
                            <TableCell align="center">{getRoleChip(u.role)}</TableCell>
                            <TableCell align="center">
                              {u.accountLocked ? (
                                <Chip size="small" label="🔒 Locked" sx={{ bgcolor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 700 }} />
                              ) : (
                                <Chip size="small" label="Active" sx={{ bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 600 }} />
                              )}
                            </TableCell>
                            <TableCell align="right">
                              {!u.isRoot && (
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                  <Tooltip title={u.accountLocked ? 'Unlock Account' : 'Lock Account'}>
                                    <IconButton size="small" onClick={() => handleToggleLock(u._id)} sx={{ color: u.accountLocked ? '#34d399' : '#f59e0b' }}>
                                      {u.accountLocked ? <LockOpenIcon fontSize="small" /> : <LockIcon fontSize="small" />}
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete User">
                                    <IconButton size="small" onClick={() => handleDeleteUser(u._id)} sx={{ color: '#ef4444' }}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Tab 1: Landing Page & Teachable Moment Customizer */}
              {tabIndex === 1 && (
                <Box>
                  <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1 }}>
                    Landing Page & Teachable Moment Customizer
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                    Customize the headlines, educational warning messages, and red flags displayed to employees when they click or report a phishing simulation.
                  </Typography>

                  <Grid container spacing={3}>
                    
                    {/* Warning Page Customizer */}
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" sx={{ color: '#f87171', fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        🚨 Phishing Click Warning (Teachable Moment)
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Warning Page Headline"
                        value={landingPage.warningTitle}
                        onChange={(e) => setLandingPage({ ...landingPage, warningTitle: e.target.value })}
                        helperText="Main headline displayed to employees upon clicking a drill link."
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Educational Warning Message"
                        value={landingPage.warningMessage}
                        onChange={(e) => setLandingPage({ ...landingPage, warningMessage: e.target.value })}
                        helperText="Reassures the user that this was an authorized drill and no passwords were saved."
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Next Steps & IT Security Desk Notice"
                        value={landingPage.nextStepsMessage}
                        onChange={(e) => setLandingPage({ ...landingPage, nextStepsMessage: e.target.value })}
                        helperText="Instructions on who to contact or how to report suspicious emails in the future."
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
                    </Grid>

                    {/* Red Flags Customizer */}
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                          🚩 Educational Red Flags Checklist
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={handleAddRedFlag}
                          sx={{ color: '#60a5fa', fontWeight: 600 }}
                        >
                          Add Red Flag
                        </Button>
                      </Box>
                    </Grid>

                    {landingPage.redFlags?.map((flag, idx) => (
                      <Grid item xs={12} sm={6} key={idx}>
                        <Card sx={{ bgcolor: '#0b0f19', border: '1px solid rgba(255,255,255,0.08)', p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>
                              Red Flag Item #{idx + 1}
                            </Typography>
                            {landingPage.redFlags.length > 1 && (
                              <IconButton size="small" onClick={() => handleRemoveRedFlag(idx)} sx={{ color: '#ef4444' }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                          <TextField
                            fullWidth
                            size="small"
                            label="Title"
                            value={flag.title}
                            onChange={(e) => handleUpdateRedFlag(idx, 'title', e.target.value)}
                            sx={{ mb: 1.5 }}
                          />
                          <TextField
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                            label="Description"
                            value={flag.description}
                            onChange={(e) => handleUpdateRedFlag(idx, 'description', e.target.value)}
                          />
                        </Card>
                      </Grid>
                    ))}

                    <Grid item xs={12}>
                      <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
                    </Grid>

                    {/* Report Confirmation Customizer */}
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" sx={{ color: '#34d399', fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        🌟 Positive Report Confirmation (Security Champion)
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Report Success Headline"
                        value={landingPage.reportSuccessTitle}
                        onChange={(e) => setLandingPage({ ...landingPage, reportSuccessTitle: e.target.value })}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Report Success Message"
                        value={landingPage.reportSuccessMessage}
                        onChange={(e) => setLandingPage({ ...landingPage, reportSuccessMessage: e.target.value })}
                      />
                    </Grid>

                  </Grid>
                </Box>
              )}

              {/* Tab 2: SIEM & Syslog Forwarder */}
              {tabIndex === 2 && (
                <Box>
                  <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1 }}>
                    Direct Network Syslog / SIEM Forwarder (LEEF 2.0 / CEF)
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                    Stream all drill clicks, credential captures, and user reports in real-time directly to your enterprise SIEM (IBM QRadar, Splunk, AlienVault).
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={<Switch checked={siem.enabled} onChange={(e) => setSiem({ ...siem, enabled: e.target.checked })} color="primary" />}
                        label={<Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 600 }}>Enable Real-Time Syslog Forwarding to SIEM</Typography>}
                      />
                    </Grid>

                    <Grid item xs={12} sm={8}>
                      <TextField
                        fullWidth
                        label="SIEM Server Host / IP Address"
                        placeholder="e.g. 10.0.50.100 or siem.corp.internal"
                        value={siem.host}
                        onChange={(e) => setSiem({ ...siem, host: e.target.value })}
                        disabled={!siem.enabled}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Syslog Port"
                        placeholder="514"
                        value={siem.port}
                        onChange={(e) => setSiem({ ...siem, port: e.target.value })}
                        disabled={!siem.enabled}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth disabled={!siem.enabled}>
                        <InputLabel sx={{ color: '#94a3b8' }}>Network Protocol</InputLabel>
                        <Select
                          value={siem.protocol}
                          label="Network Protocol"
                          onChange={(e) => setSiem({ ...siem, protocol: e.target.value })}
                          sx={{ bgcolor: '#0b0f19' }}
                        >
                          <MenuItem value="UDP">UDP (Standard RFC 5424 - Port 514)</MenuItem>
                          <MenuItem value="TCP">TCP (Reliable Delivery)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth disabled={!siem.enabled}>
                        <InputLabel sx={{ color: '#94a3b8' }}>Event Log Format</InputLabel>
                        <Select
                          value={siem.format}
                          label="Event Log Format"
                          onChange={(e) => setSiem({ ...siem, format: e.target.value })}
                          sx={{ bgcolor: '#0b0f19' }}
                        >
                          <MenuItem value="LEEF_2.0">LEEF 2.0 (IBM QRadar / AlienVault / LogRhythm)</MenuItem>
                          <MenuItem value="CEF">CEF (ArcSight / Splunk / Sentinel)</MenuItem>
                          <MenuItem value="JSON">Raw JSON Envelope</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button
                          variant="outlined"
                          startIcon={testingSiem ? <CircularProgress size={16} sx={{ color: '#3b82f6' }} /> : <PlayArrowIcon />}
                          onClick={handleTestSiem}
                          disabled={testingSiem || !siem.enabled || !siem.host}
                          sx={{ borderColor: 'rgba(59, 130, 246, 0.5)', color: '#60a5fa', fontWeight: 700 }}
                        >
                          {testingSiem ? 'Dispatching...' : 'Send Test LEEF Event'}
                        </Button>
                      </Box>

                      {siemTestResult && (
                        <Alert
                          severity={siemTestResult.success ? 'success' : 'error'}
                          sx={{
                            mt: 2,
                            bgcolor: siemTestResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: siemTestResult.success ? '#34d399' : '#f87171',
                            border: siemTestResult.success ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                          }}
                        >
                          {siemTestResult.message}
                        </Alert>
                      )}
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Tab 3: General & 180d Retention */}
              {tabIndex === 3 && (
                <Box>
                  <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1 }}>
                    General Settings & Data Retention Engine
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                    Configure organization branding, public campaign landing URLs, and automated 180-day compliance data retention.
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Public Campaign / Phish Domain URL"
                        placeholder="https://phish.yourdomain.com"
                        value={general.publicUrl}
                        onChange={(e) => setGeneral({ ...general, publicUrl: e.target.value })}
                        helperText="Used to generate warning page links and tracking pixels in emails."
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Organization Branding Name"
                        value={general.organizationName}
                        onChange={(e) => setGeneral({ ...general, organizationName: e.target.value })}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700, mb: 0.5 }}>
                        Data & Audit Log Retention Policy
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
                        SOC 2 / ISO 27001 standard data retention. Events and tracking logs older than this duration are automatically purged.
                      </Typography>
                      <TextField
                        fullWidth
                        type="number"
                        label="Data Retention Period (Days)"
                        value={general.logRetentionDays}
                        onChange={(e) => setGeneral({ ...general, logRetentionDays: e.target.value })}
                        helperText="Default: 180 days (6 months retention window)"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Box sx={{ bgcolor: '#0b0f19', p: 3, borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', mt: { sm: 4 } }}>
                        <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1 }}>
                          Immediate Retention Cleanup
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
                          Manually trigger a database vacuum to purge all audit events and tracking records older than {general.logRetentionDays} days.
                        </Typography>
                        <Button
                          variant="outlined"
                          color="warning"
                          onClick={handlePurgeRetention}
                          disabled={purgingRetention}
                          sx={{ fontWeight: 700, borderRadius: '8px' }}
                        >
                          {purgingRetention ? 'Purging Expired Records...' : 'Execute Retention Purge'}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Tab 4: Active Directory / LDAP */}
              {tabIndex === 4 && (
                <Box>
                  <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1 }}>
                    Active Directory & LDAP Directory Synchronization
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                    Connect to corporate Active Directory to automatically synchronize usernames, emails, departments, OUs, and security groups.
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={<Switch checked={ldap.enabled} onChange={(e) => setLdap({ ...ldap, enabled: e.target.checked })} color="primary" />}
                        label={<Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 600 }}>Enable Active Directory / LDAP Integration</Typography>}
                      />
                    </Grid>

                    <Grid item xs={12} sm={8}>
                      <TextField
                        fullWidth
                        label="LDAPS Server URL"
                        placeholder="ldaps://ad.corp.internal:636"
                        value={ldap.url}
                        onChange={(e) => setLdap({ ...ldap, url: e.target.value })}
                        disabled={!ldap.enabled}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Timeout (ms)"
                        value={ldap.timeout}
                        onChange={(e) => setLdap({ ...ldap, timeout: e.target.value })}
                        disabled={!ldap.enabled}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Bind DN / Service Account"
                        placeholder="CN=CyPhish-Service,OU=ServiceAccounts,DC=corp,DC=internal"
                        value={ldap.bindDN}
                        onChange={(e) => setLdap({ ...ldap, bindDN: e.target.value })}
                        disabled={!ldap.enabled}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Bind Password"
                        placeholder={ldap.hasPassword ? '•••••••• (Saved)' : 'Enter password'}
                        value={ldap.bindPassword}
                        onChange={(e) => setLdap({ ...ldap, bindPassword: e.target.value })}
                        disabled={!ldap.enabled}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Base DN"
                        placeholder="DC=corp,DC=internal"
                        value={ldap.baseDN}
                        onChange={(e) => setLdap({ ...ldap, baseDN: e.target.value })}
                        disabled={!ldap.enabled}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        startIcon={testingLdap ? <CircularProgress size={16} sx={{ color: '#3b82f6' }} /> : <PlayArrowIcon />}
                        onClick={handleTestLdap}
                        disabled={testingLdap || !ldap.enabled}
                        sx={{ borderColor: 'rgba(59, 130, 246, 0.5)', color: '#60a5fa', fontWeight: 700 }}
                      >
                        {testingLdap ? 'Testing LDAP Socket...' : 'Test Active Directory Connection'}
                      </Button>

                      {ldapTestResult && (
                        <Alert
                          severity={ldapTestResult.success ? 'success' : 'error'}
                          sx={{
                            mt: 2,
                            bgcolor: ldapTestResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: ldapTestResult.success ? '#34d399' : '#f87171',
                            border: ldapTestResult.success ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                          }}
                        >
                          {ldapTestResult.message}
                        </Alert>
                      )}
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Tab 5: Automated Reports */}
              {tabIndex === 5 && (
                <Box>
                  <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1 }}>
                    Executive Awareness Reports Scheduler
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                    Automatically dispatch PDF and HTML executive summaries of vulnerability metrics to CISO & stakeholders.
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={<Switch checked={scheduledReports.enabled} onChange={(e) => setScheduledReports({ ...scheduledReports, enabled: e.target.checked })} color="primary" />}
                        label={<Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 600 }}>Enable Scheduled Executive Reports</Typography>}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Recipient Email Addresses (Comma separated)"
                        placeholder="ciso@corp.internal, secops-leads@corp.internal"
                        value={scheduledReports.recipients}
                        onChange={(e) => setScheduledReports({ ...scheduledReports, recipients: e.target.value })}
                        disabled={!scheduledReports.enabled}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth disabled={!scheduledReports.enabled}>
                        <InputLabel sx={{ color: '#94a3b8' }}>Frequency</InputLabel>
                        <Select
                          value={scheduledReports.frequency}
                          label="Frequency"
                          onChange={(e) => setScheduledReports({ ...scheduledReports, frequency: e.target.value })}
                          sx={{ bgcolor: '#0b0f19' }}
                        >
                          <MenuItem value="weekly_monday">Weekly on Monday Morning (08:00 AM)</MenuItem>
                          <MenuItem value="weekly_friday">Weekly on Friday Afternoon</MenuItem>
                          <MenuItem value="daily">Daily Briefing</MenuItem>
                          <MenuItem value="monthly">Monthly Executive Summary</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth disabled={!scheduledReports.enabled}>
                        <InputLabel sx={{ color: '#94a3b8' }}>Delivery SMTP Profile</InputLabel>
                        <Select
                          value={scheduledReports.senderProfile}
                          label="Delivery SMTP Profile"
                          onChange={(e) => setScheduledReports({ ...scheduledReports, senderProfile: e.target.value })}
                          sx={{ bgcolor: '#0b0f19' }}
                        >
                          {senderProfiles.map((p) => (
                            <MenuItem key={p._id} value={p._id}>
                              {p.senderName} ({p.host})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Tab 6: Audit Trail */}
              {tabIndex === 6 && (
                <Box>
                  <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1 }}>
                    Security Audit Trail & Compliance Log
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                    Chronological audit record of administrative actions, drills initiated, and user role modifications (retained for {general.logRetentionDays} days).
                  </Typography>

                  <TableContainer sx={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Timestamp</TableCell>
                          <TableCell>Action</TableCell>
                          <TableCell>Actor</TableCell>
                          <TableCell>Resource</TableCell>
                          <TableCell align="center">Outcome</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {auditLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#64748b' }}>
                              No audit records recorded yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          auditLogs.map((log) => (
                            <TableRow key={log._id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                              <TableCell sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {new Date(log.createdAt).toLocaleString()}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600, color: '#f8fafc' }}>{log.action}</TableCell>
                              <TableCell sx={{ color: '#60a5fa' }}>{log.actor?.username || log.actor?.email || 'System'}</TableCell>
                              <TableCell sx={{ color: '#cbd5e1' }}>{log.resourceType} {log.resourceId ? `(${log.resourceId})` : ''}</TableCell>
                              <TableCell align="center">
                                <Chip size="small" label={log.outcome || 'Success'} sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.72rem' }} />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

            </CardContent>
          </Card>

          {/* Add Platform User Modal */}
          <Dialog
            open={userModalOpen}
            onClose={() => !userCreating && setUserModalOpen(false)}
            PaperProps={{
              sx: {
                bgcolor: '#111827',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                p: 1,
                minWidth: { xs: '90%', sm: 520 },
              },
            }}
          >
            <form onSubmit={handleCreateUserSubmit}>
              <DialogTitle sx={{ color: '#f8fafc', fontWeight: 700 }}>
                Provision Delegated Administrator / Engineer
              </DialogTitle>
              <DialogContent>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={newUserData.firstName}
                      onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={newUserData.lastName}
                      onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={newUserData.username}
                      onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="email"
                      label="Email Address"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="password"
                      label="Initial Password"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      required
                      helperText="Minimum 6 characters"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: '#94a3b8' }}>Platform Role</InputLabel>
                      <Select
                        value={newUserData.role}
                        label="Platform Role"
                        onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                        sx={{ bgcolor: '#0b0f19' }}
                      >
                        <MenuItem value="campaign_manager">🛠️ Security Engineer (Drill Operator)</MenuItem>
                        <MenuItem value="viewer">👁️ Auditor / Viewer (Read Only)</MenuItem>
                        <MenuItem value="admin">👑 Administrator (Full Control)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setUserModalOpen(false)} disabled={userCreating} sx={{ color: '#94a3b8' }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={userCreating}
                  sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 700 }}
                >
                  {userCreating ? 'Creating...' : 'Provision User'}
                </Button>
              </DialogActions>
            </form>
          </Dialog>

        </Container>
        <Footer />
      </Box>
    </Box>
  );
};

export default Settings;
