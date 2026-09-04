import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Paper,
  Tooltip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Rating,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Email as EmailIcon,
  ContentCopy as ContentCopyIcon,
  Smartphone as SmartphoneIcon,
  DesktopWindows as DesktopWindowsIcon,
  Code as CodeIcon,
  Flag as FlagIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Settings as SettingsIcon,
  CheckCircleOutline as CheckIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import {
  generateAITemplate,
  getAIIntegration,
  createTemplate,
  renderTemplate,
} from '../../services/templateService';

const AUDIENCES = [
  'General Employees',
  'Finance & Accounting',
  'IT & DevOps',
  'HR & Talent Acquisition',
  'C-Suite & Executives',
  'Sales & Marketing',
  'Legal & Compliance',
  'Customer Support',
];

const CATEGORIES = [
  'IT & Security',
  'Finance & Payroll',
  'HR & Benefits',
  'Executive / Spear',
  'Urgent Notice',
];

const TONES = [
  'Authoritative & Urgent',
  'Casual Internal Notification',
  'Strict Legal & Compliance',
  'Helpful IT Support Request',
  'Executive Direct Order',
];

const PRESETS = [
  {
    label: '🔐 Microsoft 365 MFA Expiry',
    category: 'IT & Security',
    audience: 'General Employees',
    difficulty: 3,
    tone: 'Authoritative & Urgent',
    prompt: 'Urgent notification from Microsoft 365 Security stating multi-factor authentication (MFA) credentials will expire in 2 hours without verification.',
  },
  {
    label: '💳 Overdue Vendor Wire Invoice',
    category: 'Finance & Payroll',
    audience: 'Finance & Accounting',
    difficulty: 4,
    tone: 'Authoritative & Urgent',
    prompt: 'Urgent vendor invoice payment reminder with an attached payment remittance link and late penalty warning.',
  },
  {
    label: '🎁 Annual Performance Bonus Review',
    category: 'HR & Benefits',
    audience: 'General Employees',
    difficulty: 3,
    tone: 'Casual Internal Notification',
    prompt: 'Confidential HR letter requesting employee to log in and confirm their annual performance compensation adjustment.',
  },
  {
    label: '📦 FedEx / DHL Parcel Hold Alert',
    category: 'Urgent Notice',
    audience: 'General Employees',
    difficulty: 2,
    tone: 'Authoritative & Urgent',
    prompt: 'Delivery failure notice stating a parcel is held at the sorting hub due to an incomplete address verification.',
  },
  {
    label: '📹 Urgent CEO Teams Meeting',
    category: 'Executive / Spear',
    audience: 'C-Suite & Executives',
    difficulty: 5,
    tone: 'Executive Direct Order',
    prompt: 'Direct email from the CEO requesting an immediate join to a confidential executive strategy call on Microsoft Teams.',
  },
  {
    label: '🔒 Mandatory SSL Certificate Update',
    category: 'IT & Security',
    audience: 'IT & DevOps',
    difficulty: 4,
    tone: 'Strict Legal & Compliance',
    prompt: 'IT infrastructure alert requiring engineers to install and verify an updated corporate root certificate on their workstations.',
  },
];

const SAMPLE_PREVIEW_DATA = {
  firstName: 'Alexander',
  lastName: 'Wright',
  email: 'a.wright@corp.internal',
  company: 'Global Enterprises Inc.',
  department: 'Information Technology',
  role: 'Systems Engineer',
  link: 'https://security-verify.internal/training/warning?id=ai-demo',
  reportLink: 'https://security-verify.internal/api/tracking/report/ai-demo',
};

const AIBuilder = () => {
  const navigate = useNavigate();

  // Active AI Engine State
  const [activeAI, setActiveAI] = useState(null);
  const [aiLoading, setAiLoading] = useState(true);

  // Form Parameters
  const [targetAudience, setTargetAudience] = useState('General Employees');
  const [category, setCategory] = useState('IT & Security');
  const [difficulty, setDifficulty] = useState(3);
  const [tone, setTone] = useState('Authoritative & Urgent');
  const [companyName, setCompanyName] = useState('CyPhish Enterprise');
  const [scenarioPrompt, setScenarioPrompt] = useState(
    'Urgent notification from Microsoft 365 Security stating multi-factor authentication (MFA) credentials will expire in 2 hours without verification.'
  );

  // Generation & Output State
  const [generating, setGenerating] = useState(false);
  const [generatedScenario, setGeneratedScenario] = useState(null);
  const [previewMode, setPreviewMode] = useState('desktop'); // desktop, mobile, flags, code
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [alert, setAlert] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    loadAIStatus();
  }, []);

  const loadAIStatus = async () => {
    try {
      setAiLoading(true);
      const res = await getAIIntegration();
      if (res.success && res.data) {
        setActiveAI(res.data);
      } else {
        setActiveAI(null);
      }
    } catch (err) {
      setActiveAI(null);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyPreset = (preset) => {
    setCategory(preset.category);
    setTargetAudience(preset.audience);
    setDifficulty(preset.difficulty);
    setTone(preset.tone);
    setScenarioPrompt(preset.prompt);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setAlert(null);
    try {
      const res = await generateAITemplate({
        targetAudience,
        category,
        difficulty,
        tone,
        companyName,
        scenarioPrompt,
      });

      if (res.success && res.data) {
        setGeneratedScenario(res.data);
        setAlert({
          severity: 'success',
          message: `✨ Scenario generated successfully via ${res.data.aiProvider?.toUpperCase() || 'AI Engine'} (${res.data.aiModel || 'active model'}).`,
        });
      } else {
        setAlert({
          severity: 'error',
          message: res.message || 'Failed to generate scenario.',
        });
      }
    } catch (err) {
      setAlert({
        severity: 'error',
        message: err.response?.data?.message || err.message || 'Error communicating with AI engine.',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!generatedScenario) return;
    setSavingToLibrary(true);
    try {
      const payload = {
        name: generatedScenario.name,
        subject: generatedScenario.subject,
        category: generatedScenario.category,
        difficulty: generatedScenario.difficulty,
        htmlContent: generatedScenario.htmlContent,
        type: generatedScenario.category,
        sourceFormat: 'html',
      };

      const res = await createTemplate(payload);
      if (res.success) {
        setAlert({
          severity: 'success',
          message: `💾 Scenario "${generatedScenario.name}" saved to Scenario Library successfully!`,
        });
      } else {
        setAlert({ severity: 'error', message: res.message || 'Failed to save template.' });
      }
    } catch (err) {
      setAlert({ severity: 'error', message: err.response?.data?.message || err.message });
    } finally {
      setSavingToLibrary(false);
    }
  };

  const handleOpenInComposer = () => {
    if (!generatedScenario) return;
    navigate('/console/templates/new', {
      state: {
        template: {
          name: generatedScenario.name,
          subject: generatedScenario.subject,
          category: generatedScenario.category,
          difficulty: generatedScenario.difficulty,
          htmlContent: generatedScenario.htmlContent,
        },
      },
    });
  };

  const handleCopyCode = () => {
    if (!generatedScenario?.htmlContent) return;
    navigator.clipboard.writeText(generatedScenario.htmlContent);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const renderedPreview = useMemo(() => {
    if (!generatedScenario?.htmlContent) return '';
    return renderTemplate(generatedScenario.htmlContent, SAMPLE_PREVIEW_DATA);
  }, [generatedScenario]);

  const getDifficultyLabel = (diff) => {
    switch (diff) {
      case 1:
        return 'Level 1: Novice (Obvious typos & generic alert)';
      case 2:
        return 'Level 2: Easy (Minor urgency with identifiable flaws)';
      case 3:
        return 'Level 3: Intermediate (Believable corporate formatting)';
      case 4:
        return 'Level 4: Advanced (Subtle pretext & department context)';
      case 5:
        return 'Level 5: Spear Phish (Hyper-targeted executive simulation)';
      default:
        return `Level ${diff}`;
    }
  };

  return (
    <Box sx={{ mt: 1 }}>
      
      {/* Top AI Engine Status Banner */}
      <Card
        sx={{
          bgcolor: '#111827',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '16px',
          mb: 3,
          p: 2.5,
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'rgba(59, 130, 246, 0.15)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AutoAwesomeIcon sx={{ color: '#60a5fa', fontSize: '1.8rem' }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                AI Threat Scenario & Template Generator
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Generate full-fidelity, customizable phishing simulation scenarios powered by your connected AI engine.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {aiLoading ? (
              <CircularProgress size={20} sx={{ color: '#60a5fa' }} />
            ) : activeAI && activeAI.provider ? (
              <Chip
                icon={<CheckIcon sx={{ color: '#34d399 !important' }} />}
                label={`Engine: ${activeAI.provider.toUpperCase()} (${activeAI.model || 'active'})`}
                sx={{
                  bgcolor: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                }}
              />
            ) : (
              <Button
                variant="outlined"
                color="warning"
                size="small"
                startIcon={<SettingsIcon />}
                onClick={() => navigate('/console/account')}
                sx={{ fontWeight: 700, borderRadius: '8px' }}
              >
                Configure AI Provider
              </Button>
            )}
          </Box>
        </Box>
      </Card>

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

      {/* Main Studio Workspace */}
      <Grid container spacing={3}>
        
        {/* Left Column: Parameter Controls */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700, mb: 2 }}>
                🛠️ Drill Parameters & Pretext Settings
              </Typography>

              {/* Quick Presets */}
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, display: 'block', mb: 1 }}>
                Quick Threat Presets:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1, mb: 2.5 }}>
                {PRESETS.map((p, idx) => (
                  <Chip
                    key={idx}
                    label={p.label}
                    size="small"
                    onClick={() => handleApplyPreset(p)}
                    clickable
                    sx={{
                      bgcolor: 'rgba(59, 130, 246, 0.1)',
                      color: '#93c5fd',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      fontWeight: 600,
                      fontSize: '0.72rem',
                      '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.2)' },
                    }}
                  />
                ))}
              </Stack>

              <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.06)' }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: '#94a3b8' }}>Target Audience</InputLabel>
                    <Select
                      value={targetAudience}
                      label="Target Audience"
                      onChange={(e) => setTargetAudience(e.target.value)}
                      sx={{ bgcolor: '#0b0f19' }}
                    >
                      {AUDIENCES.map((a) => (
                        <MenuItem key={a} value={a}>
                          {a}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: '#94a3b8' }}>Threat Category</InputLabel>
                    <Select
                      value={category}
                      label="Threat Category"
                      onChange={(e) => setCategory(e.target.value)}
                      sx={{ bgcolor: '#0b0f19' }}
                    >
                      {CATEGORIES.map((c) => (
                        <MenuItem key={c} value={c}>
                          {c}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: '#94a3b8' }}>Communication Tone</InputLabel>
                    <Select
                      value={tone}
                      label="Communication Tone"
                      onChange={(e) => setTone(e.target.value)}
                      sx={{ bgcolor: '#0b0f19' }}
                    >
                      {TONES.map((t) => (
                        <MenuItem key={t} value={t}>
                          {t}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Target Company Context"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    sx={{ bgcolor: '#0b0f19' }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ bgcolor: '#0b0f19', p: 2, borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                        Sophistication Difficulty:
                      </Typography>
                      <Rating
                        value={difficulty}
                        onChange={(e, val) => setDifficulty(val || 3)}
                        sx={{
                          '& .MuiRating-iconFilled': { color: '#f59e0b' },
                          '& .MuiRating-iconEmpty': { color: '#475569' },
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 600 }}>
                      {getDifficultyLabel(difficulty)}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Scenario Pretext & Instructions"
                    placeholder="Describe the social engineering pretext, simulated sender, call to action, or specific brand impersonation..."
                    value={scenarioPrompt}
                    onChange={(e) => setScenarioPrompt(e.target.value)}
                    sx={{ bgcolor: '#0b0f19' }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={generating ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <AutoAwesomeIcon />}
                    onClick={handleGenerate}
                    disabled={generating || (!activeAI?.provider && !activeAI?.hasApiKey)}
                    sx={{
                      bgcolor: '#3b82f6',
                      color: '#fff',
                      fontWeight: 700,
                      py: 1.4,
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(59, 130, 246, 0.35)',
                      '&:hover': { bgcolor: '#2563eb' },
                    }}
                  >
                    {generating ? 'Crafting Threat Scenario with AI...' : 'Generate Threat Scenario'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Live Interactive Preview & Inspector */}
        <Grid item xs={12} lg={7}>
          <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* Preview Toolbar */}
            <Box
              sx={{
                p: 2.5,
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                  {generatedScenario ? generatedScenario.name : 'Generated Scenario Preview'}
                </Typography>
                {generatedScenario && (
                  <Typography variant="body2" sx={{ color: '#60a5fa', fontWeight: 600, fontSize: '0.82rem' }}>
                    Subject: {generatedScenario.subject}
                  </Typography>
                )}
              </Box>

              {/* View Selector */}
              {generatedScenario && (
                <ToggleButtonGroup
                  size="small"
                  value={previewMode}
                  exclusive
                  onChange={(e, val) => val && setPreviewMode(val)}
                  sx={{
                    bgcolor: '#0b0f19',
                    '& .MuiToggleButton-root': {
                      color: '#94a3b8',
                      px: 1.5,
                      py: 0.5,
                      '&.Mui-selected': { color: '#60a5fa', bgcolor: 'rgba(59, 130, 246, 0.15)' },
                    },
                  }}
                >
                  <ToggleButton value="desktop">
                    <Tooltip title="Desktop Email View"><DesktopWindowsIcon fontSize="small" /></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="mobile">
                    <Tooltip title="Mobile Email View"><SmartphoneIcon fontSize="small" /></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="flags">
                    <Tooltip title="Educational Red Flags"><FlagIcon fontSize="small" /></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="code">
                    <Tooltip title="Raw HTML Code"><CodeIcon fontSize="small" /></Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            </Box>

            {/* Preview Body */}
            <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: generatedScenario ? 'flex-start' : 'center', alignItems: generatedScenario ? 'stretch' : 'center' }}>
              {!generatedScenario ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Box sx={{ p: 2, bgcolor: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', display: 'inline-flex', mb: 2 }}>
                    <EmailIcon sx={{ fontSize: 48, color: '#3b82f6' }} />
                  </Box>
                  <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                    No Scenario Generated Yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 420, mx: 'auto', mt: 1 }}>
                    Select your target department, pick a threat theme or quick preset on the left, and click <strong>"Generate Threat Scenario"</strong>.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ width: '100%' }}>
                  
                  {/* Metadata Chips */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip size="small" label={generatedScenario.category} sx={{ bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 700 }} />
                    <Chip size="small" label={`Difficulty: ${generatedScenario.difficulty}/5`} sx={{ bgcolor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 700 }} />
                    {generatedScenario.senderNameSuggestion && (
                      <Chip size="small" label={`Suggested Sender: ${generatedScenario.senderNameSuggestion}`} sx={{ bgcolor: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1' }} />
                    )}
                  </Box>

                  {/* Desktop / Mobile Rendered Preview */}
                  {(previewMode === 'desktop' || previewMode === 'mobile') && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        bgcolor: '#070b14',
                        p: 2,
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <Paper
                        elevation={4}
                        sx={{
                          width: previewMode === 'mobile' ? '375px' : '100%',
                          maxWidth: '650px',
                          bgcolor: '#ffffff',
                          color: '#1e293b',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {/* Mock Email Header */}
                        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                            <strong>From:</strong> {generatedScenario.senderNameSuggestion || 'IT Support'} &lt;security@auth-update.internal&gt;
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                            <strong>To:</strong> Alexander Wright &lt;a.wright@corp.internal&gt;
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5 }}>
                            {generatedScenario.subject}
                          </Typography>
                        </Box>

                        {/* Rendered HTML Container */}
                        <Box
                          sx={{ p: 3, minHeight: '260px', maxHeight: '480px', overflowY: 'auto' }}
                          dangerouslySetInnerHTML={{ __html: renderedPreview }}
                        />
                      </Paper>
                    </Box>
                  )}

                  {/* Educational Red Flags View */}
                  {previewMode === 'flags' && (
                    <Box sx={{ py: 1 }}>
                      <Typography variant="subtitle2" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1.5 }}>
                        🚩 AI-Identified Social Engineering Red Flags:
                      </Typography>
                      <Grid container spacing={2}>
                        {generatedScenario.educationalRedFlags?.map((flag, idx) => (
                          <Grid item xs={12} sm={6} key={idx}>
                            <Card sx={{ bgcolor: '#0b0f19', border: '1px solid rgba(239, 68, 68, 0.25)', p: 2, borderRadius: '12px' }}>
                              <Typography variant="subtitle2" sx={{ color: '#f87171', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                {flag.title}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5, fontSize: '0.82rem' }}>
                                {flag.description}
                              </Typography>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {/* Raw HTML Code View */}
                  {previewMode === 'code' && (
                    <Box sx={{ position: 'relative' }}>
                      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ContentCopyIcon />}
                          onClick={handleCopyCode}
                          sx={{ bgcolor: '#0b0f19', color: copySuccess ? '#34d399' : '#93c5fd', borderColor: 'rgba(255,255,255,0.1)' }}
                        >
                          {copySuccess ? 'Copied!' : 'Copy Code'}
                        </Button>
                      </Box>
                      <TextField
                        fullWidth
                        multiline
                        rows={14}
                        value={generatedScenario.htmlContent}
                        InputProps={{
                          readOnly: true,
                          sx: {
                            fontFamily: 'monospace',
                            fontSize: '0.78rem',
                            bgcolor: '#070b14',
                            color: '#93c5fd',
                          },
                        }}
                      />
                    </Box>
                  )}

                </Box>
              )}
            </CardContent>

            {/* Bottom Action Footer */}
            {generatedScenario && (
              <Box
                sx={{
                  p: 2.5,
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleGenerate}
                  disabled={generating}
                  sx={{ color: '#94a3b8', borderColor: 'rgba(255,255,255,0.15)', fontWeight: 600 }}
                >
                  Regenerate
                </Button>

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={handleOpenInComposer}
                    sx={{ color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.4)', fontWeight: 700 }}
                  >
                    Open in Full HTML Editor
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={savingToLibrary ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <SaveIcon />}
                    onClick={handleSaveToLibrary}
                    disabled={savingToLibrary}
                    sx={{ bgcolor: '#10b981', color: '#fff', fontWeight: 700, '&:hover': { bgcolor: '#059669' } }}
                  >
                    {savingToLibrary ? 'Saving...' : 'Save to Library'}
                  </Button>
                </Box>
              </Box>
            )}

          </Card>
        </Grid>

      </Grid>
    </Box>
  );
};

export default AIBuilder;
