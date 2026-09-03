import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  Card,
  CardContent,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  PlayArrow as PlayArrowIcon,
  Security as SecurityIcon,
  Dns as DnsIcon,
} from '@mui/icons-material';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import { useNavigate } from 'react-router-dom';
import { useSenderProfiles } from '../../hooks/useSenderProfiles';

const CreateSenderProfile = () => {
  const navigate = useNavigate();
  const { createSenderProfile, testConnection, loading, error } = useSenderProfiles();

  const [senderName, setSenderName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [encryptionMode, setEncryptionMode] = useState('starttls_strict');
  const [minTlsVersion, setMinTlsVersion] = useState('TLSv1.3');
  const [customCaCertificate, setCustomCaCertificate] = useState('');
  const [ignoreTlsCertificateErrors, setIgnoreTlsCertificateErrors] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  const [testTesting, setTestTesting] = useState(false);
  const [testStatus, setTestStatus] = useState(null);

  const handleApplyPreset = (presetType) => {
    if (presetType === 'exchange_587') {
      setPort('587');
      setEncryptionMode('starttls_strict');
      setMinTlsVersion('TLSv1.3');
    } else if (presetType === 'smtps_465') {
      setPort('465');
      setEncryptionMode('smtps_direct');
      setMinTlsVersion('TLSv1.3');
    } else if (presetType === 'postfix_25') {
      setPort('25');
      setEncryptionMode('starttls_opportunistic');
      setMinTlsVersion('TLSv1.2');
    }
  };

  const handleCaFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCustomCaCertificate(content);
      }
    };
    reader.readAsText(file);
  };

  const handleTestNow = async () => {
    if (!host || !port) {
      setTestStatus({ success: false, message: 'Please provide SMTP Host and Port before testing.' });
      return;
    }
    setTestTesting(true);
    setTestStatus(null);
    const res = await testConnection({
      host: host.trim(),
      port: Number(port),
      email: email.trim(),
      password,
      encryptionMode,
      minTlsVersion,
      customCaCertificate,
      ignoreTlsCertificateErrors,
    });
    setTestStatus(res);
    setTestTesting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      senderName: senderName.trim(),
      host: host.trim(),
      port: Number(port),
      email: email.trim(),
      password,
      encryptionMode,
      minTlsVersion,
      customCaCertificate: customCaCertificate.trim(),
      ignoreTlsCertificateErrors,
      isDefault,
    };

    const res = await createSenderProfile(payload);
    if (res.success) {
      navigate('/console/sender-profile');
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0b0f19' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="lg" sx={{ flexGrow: 1, mt: '80px', mb: 4, px: { xs: 2, sm: 3 } }}>
          
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <IconButton
              onClick={() => navigate('/console/sender-profile')}
              sx={{ color: '#94a3b8', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f8fafc', fontSize: { xs: '1.3rem', md: '1.6rem' } }}>
                Configure SMTP Relay Station
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Setup mail server connectivity with TLS 1.3 encryption and in-GUI Exchange Root CA trust injection.
              </Typography>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              {error}
            </Alert>
          )}

          {testStatus && (
            <Alert
              severity={testStatus.success ? 'success' : 'error'}
              sx={{
                mb: 3,
                bgcolor: testStatus.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: testStatus.success ? '#34d399' : '#f87171',
                border: testStatus.success ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              {testStatus.message}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              
              {/* Left Column: Relay Specs & Auth */}
              <Grid item xs={12} md={7}>
                <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', mb: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DnsIcon sx={{ color: '#3b82f6' }} /> Relay Connection Details
                    </Typography>

                    {/* Presets */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                      <Typography variant="caption" sx={{ color: '#64748b', alignSelf: 'center', mr: 1 }}>
                        Quick Presets:
                      </Typography>
                      <Button size="small" variant="outlined" onClick={() => handleApplyPreset('exchange_587')} sx={{ borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa', fontSize: '0.75rem' }}>
                        Exchange / M365 (587)
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => handleApplyPreset('smtps_465')} sx={{ borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa', fontSize: '0.75rem' }}>
                        Direct SMTPS (465)
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => handleApplyPreset('postfix_25')} sx={{ borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa', fontSize: '0.75rem' }}>
                        Internal Postfix (25)
                      </Button>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Profile / Display Name"
                          placeholder="e.g. Corporate Exchange Relay"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          required
                        />
                      </Grid>

                      <Grid item xs={12} sm={8}>
                        <TextField
                          fullWidth
                          label="SMTP Host / IP Address"
                          placeholder="e.g. mail.corp.internal or 10.0.1.25"
                          value={host}
                          onChange={(e) => setHost(e.target.value)}
                          required
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Port"
                          type="number"
                          placeholder="587"
                          value={port}
                          onChange={(e) => setPort(e.target.value)}
                          required
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="SMTP Username / Sender Email"
                          placeholder="phish-drill@corp.internal"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: '#64748b' }}>
                                  {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <FormControlLabel
                          control={<Switch checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} color="primary" />}
                          label={<Typography variant="body2" sx={{ color: '#cbd5e1' }}>Set as Primary Default Relay for All Campaigns</Typography>}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Right Column: TLS & Exchange CA */}
              <Grid item xs={12} md={5}>
                <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', mb: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SecurityIcon sx={{ color: '#10b981' }} /> Encryption & TLS Settings
                    </Typography>

                    <FormControl component="fieldset" sx={{ mb: 2.5, width: '100%' }}>
                      <FormLabel component="legend" sx={{ color: '#94a3b8', fontSize: '0.8rem', mb: 1 }}>
                        Encryption Handshake Mode
                      </FormLabel>
                      <RadioGroup value={encryptionMode} onChange={(e) => setEncryptionMode(e.target.value)}>
                        <FormControlLabel value="starttls_strict" control={<Radio size="small" />} label={<Typography variant="body2" sx={{ color: '#f8fafc' }}>STARTTLS Strict (Mandatory TLS 1.3)</Typography>} />
                        <FormControlLabel value="smtps_direct" control={<Radio size="small" />} label={<Typography variant="body2" sx={{ color: '#f8fafc' }}>Direct SMTPS (Implicit SSL/TLS - Port 465)</Typography>} />
                        <FormControlLabel value="starttls_opportunistic" control={<Radio size="small" />} label={<Typography variant="body2" sx={{ color: '#f8fafc' }}>Opportunistic STARTTLS (Fallback to plain)</Typography>} />
                        <FormControlLabel value="none" control={<Radio size="small" />} label={<Typography variant="body2" sx={{ color: '#f8fafc' }}>Plaintext (No Encryption - Port 25)</Typography>} />
                      </RadioGroup>
                    </FormControl>

                    <Box sx={{ mb: 2.5 }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1 }}>
                        Minimum TLS Protocol Version
                      </Typography>
                      <Select
                        fullWidth
                        size="small"
                        value={minTlsVersion}
                        onChange={(e) => setMinTlsVersion(e.target.value)}
                        sx={{ bgcolor: '#0b0f19' }}
                      >
                        <MenuItem value="TLSv1.3">TLS 1.3 (Recommended / Highest Security)</MenuItem>
                        <MenuItem value="TLSv1.2">TLS 1.2 (Legacy Compatibility)</MenuItem>
                      </Select>
                    </Box>

                    <Divider sx={{ my: 2.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

                    {/* In-GUI Exchange Root CA Importer */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                          Exchange / Corporate Root CA (PEM)
                        </Typography>
                        <Button
                          component="label"
                          size="small"
                          startIcon={<CloudUploadIcon />}
                          sx={{ color: '#60a5fa', textTransform: 'none', fontSize: '0.75rem' }}
                        >
                          Browse Certificate
                          <input type="file" accept=".pem,.crt,.cer,.txt" hidden onChange={handleCaFileUpload} />
                        </Button>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1.5 }}>
                        Upload or paste your internal Root CA certificate. Injected dynamically into Node's TLS trust store (zero container rebuilds).
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDXTCCAkWgAwIBAgIJ...&#10;-----END CERTIFICATE-----"
                        value={customCaCertificate}
                        onChange={(e) => setCustomCaCertificate(e.target.value)}
                        sx={{
                          '& .MuiInputBase-input': {
                            fontFamily: 'monospace',
                            fontSize: '0.78rem',
                          },
                        }}
                      />
                    </Box>

                    <FormControlLabel
                      control={<Switch checked={ignoreTlsCertificateErrors} onChange={(e) => setIgnoreTlsCertificateErrors(e.target.checked)} color="warning" />}
                      label={<Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.8rem' }}>Ignore SSL/TLS Hostname Errors (Self-Signed Testing)</Typography>}
                    />
                  </CardContent>
                </Card>

                {/* Live Test & Save Actions */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={testTesting ? <CircularProgress size={16} sx={{ color: '#3b82f6' }} /> : <PlayArrowIcon />}
                    onClick={handleTestNow}
                    disabled={testTesting}
                    sx={{
                      borderColor: 'rgba(59, 130, 246, 0.5)',
                      color: '#60a5fa',
                      fontWeight: 700,
                      borderRadius: '10px',
                      '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' },
                    }}
                  >
                    {testTesting ? 'Testing Socket...' : 'Test TLS Handshake'}
                  </Button>

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    sx={{
                      bgcolor: '#3b82f6',
                      color: '#fff',
                      fontWeight: 700,
                      px: 3,
                      borderRadius: '10px',
                      '&:hover': { bgcolor: '#2563eb' },
                    }}
                  >
                    {loading ? 'Saving Profile...' : 'Save Relay Profile'}
                  </Button>
                </Box>
              </Grid>

            </Grid>
          </form>

        </Container>
        <Footer />
      </Box>
    </Box>
  );
};

export default CreateSenderProfile;
