import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Divider,
  Grid,
  TextField,
  Typography,
  Chip,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Rating,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CodeIcon from '@mui/icons-material/Code';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import StarIcon from '@mui/icons-material/Star';
import SaveIcon from '@mui/icons-material/Save';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import { useTemplates } from '../../hooks/useTemplates';
import { renderTemplate } from '../../services/templateService';

const TOKENS = [
  { label: 'First Name', token: '{{firstName}}' },
  { label: 'Last Name', token: '{{lastName}}' },
  { label: 'Email', token: '{{email}}' },
  { label: 'Phish Warning Link', token: '{{link}}' },
  { label: 'Report Incident Link', token: '{{reportLink}}' },
  { label: 'Department', token: '{{department}}' },
  { label: 'Company', token: '{{company}}' },
  { label: 'Role/Title', token: '{{role}}' },
];

const CATEGORIES = ['IT & Security', 'Finance & Payroll', 'HR & Benefits', 'Executive / Spear', 'Urgent Notice'];

const SAMPLE_DATA = {
  firstName: 'Alexander',
  lastName: 'Wright',
  email: 'a.wright@corp.internal',
  link: 'https://security-verify.internal/training/warning?id=demo',
  reportLink: 'https://security-verify.internal/api/tracking/report/demo',
  department: 'Information Technology',
  company: 'Global Enterprises Inc.',
  role: 'Senior Systems Architect',
};

const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #0f172a; padding: 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px 24px; color: #334155; line-height: 1.6; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 16px 24px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0; font-size: 20px;">Urgent Security Verification Required</h2>
    </div>
    <div class="content">
      <p>Hello <strong>{{firstName}}</strong>,</p>
      <p>Our centralized security systems detected an unrecognized login attempt to your <strong>{{company}}</strong> account associated with department <strong>{{department}}</strong>.</p>
      <p>To prevent immediate session suspension, please review your active authentication credentials below:</p>
      <div style="text-align: center;">
        <a href="{{link}}" class="btn">Verify Security Credentials Now</a>
      </div>
      <p style="font-size: 13px; color: #64748b;">If you believe this alert was received in error, you may report it to SecOps <a href="{{reportLink}}">here</a>.</p>
    </div>
    <div class="footer">
      This is an automated system notification sent to {{email}}.
    </div>
  </div>
</body>
</html>`;

const TemplateComposer = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const { createTemplate, updateTemplate, getTemplateById, loading, error } = useTemplates();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('IT & Security');
  const [difficulty, setDifficulty] = useState(3);
  const [htmlContent, setHtmlContent] = useState(DEFAULT_HTML_TEMPLATE);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [fetchLoading, setFetchLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setFetchLoading(true);
      getTemplateById(id).then((res) => {
        if (res && res.data) {
          const t = res.data;
          setName(t.name || '');
          setSubject(t.subject || '');
          setCategory(t.category || 'IT & Security');
          setDifficulty(t.difficulty || 3);
          setHtmlContent(t.htmlContent || '');
        }
        setFetchLoading(false);
      });
    }
  }, [id, isEditing]);

  const insertToken = (token) => {
    setHtmlContent((prev) => `${prev} ${token}`);
  };

  const renderedPreview = useMemo(() => {
    if (!htmlContent) return '';
    return renderTemplate(htmlContent, SAMPLE_DATA);
  }, [htmlContent]);

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      name: name.trim(),
      subject: subject.trim(),
      category,
      difficulty,
      htmlContent,
      type: 'custom',
    };

    if (isEditing) {
      const res = await updateTemplate(id, payload);
      if (res.success) navigate('/console/templates');
    } else {
      const res = await createTemplate(payload);
      if (res.success) navigate('/console/templates');
    }
  };

  if (fetchLoading) {
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
          
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={() => navigate('/console/templates')}
                sx={{ color: '#94a3b8', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#f8fafc', fontSize: { xs: '1.3rem', md: '1.6rem' } }}>
                  {isEditing ? 'Edit Phishing Threat Scenario' : 'Scenario Studio & HTML Composer'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Author full-fidelity email templates with live tag rendering, token variables, and mobile preview.
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={loading || !name.trim() || !subject.trim()}
              sx={{
                bgcolor: '#3b82f6',
                color: '#fff',
                px: 3,
                py: 1.2,
                borderRadius: '10px',
                fontWeight: 700,
                '&:hover': { bgcolor: '#2563eb' },
              }}
            >
              {loading ? 'Saving...' : isEditing ? 'Update Template' : 'Save Scenario'}
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            
            {/* Left Column: Editor & Metadata */}
            <Grid item xs={12} lg={6}>
              <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  
                  {/* Metadata Row */}
                  <Grid container spacing={2} sx={{ mb: 2.5 }}>
                    <Grid item xs={12} sm={8}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Scenario Title"
                        placeholder="e.g. M365 Password Expiry Alert"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel sx={{ color: '#94a3b8' }}>Category</InputLabel>
                        <Select
                          value={category}
                          label="Category"
                          onChange={(e) => setCategory(e.target.value)}
                          sx={{ bgcolor: '#0b0f19' }}
                        >
                          {CATEGORIES.map((cat) => (
                            <MenuItem key={cat} value={cat}>
                              {cat}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={8}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Email Subject Line"
                        placeholder="Urgent: Your account requires immediate verification"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', bgcolor: '#0b0f19', p: 1, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, mb: 0.2 }}>
                          Difficulty Level:
                        </Typography>
                        <Rating
                          value={difficulty}
                          onChange={(e, nv) => setDifficulty(nv || 3)}
                          size="small"
                          emptyIcon={<StarIcon sx={{ color: 'rgba(255,255,255,0.15)', fontSize: '1rem' }} />}
                          icon={<StarIcon sx={{ color: '#fbbf24', fontSize: '1rem' }} />}
                        />
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Token Quick Inserter */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', mb: 1 }}>
                      Insert Target Placeholders:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                      {TOKENS.map((t) => (
                        <Chip
                          key={t.token}
                          label={t.label}
                          size="small"
                          onClick={() => insertToken(t.token)}
                          sx={{
                            bgcolor: 'rgba(59, 130, 246, 0.12)',
                            color: '#60a5fa',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.25)' },
                          }}
                        />
                      ))}
                    </Box>
                  </Box>

                  {/* Code Editor */}
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', mb: 1 }}>
                      HTML / EML Source (Zero restrictions - complex tables & inline CSS allowed):
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={18}
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: '"Fira Code", "Courier New", monospace',
                          fontSize: '0.8rem',
                          lineHeight: 1.5,
                        },
                      }}
                    />
                  </Box>

                </CardContent>
              </Card>
            </Grid>

            {/* Right Column: Live Responsive Split Preview */}
            <Grid item xs={12} lg={6}>
              <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Preview Controls */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VisibilityIcon sx={{ color: '#10b981' }} />
                      <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                        Live Client Render
                      </Typography>
                    </Box>

                    <ToggleButtonGroup
                      value={previewDevice}
                      exclusive
                      size="small"
                      onChange={(e, val) => val && setPreviewDevice(val)}
                      sx={{ bgcolor: '#0b0f19' }}
                    >
                      <ToggleButton value="desktop" sx={{ color: '#94a3b8', px: 1.5 }}>
                        <DesktopWindowsIcon sx={{ fontSize: 18, mr: 0.5 }} /> Desktop
                      </ToggleButton>
                      <ToggleButton value="mobile" sx={{ color: '#94a3b8', px: 1.5 }}>
                        <SmartphoneIcon sx={{ fontSize: 18, mr: 0.5 }} /> Mobile
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>

                  {/* Simulated Email Envelope Header */}
                  <Box sx={{ bgcolor: '#0b0f19', p: 2, borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)', mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                      <strong style={{ color: '#cbd5e1' }}>Subject:</strong> {subject || '(No subject provided)'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.8rem', mt: 0.3 }}>
                      <strong style={{ color: '#cbd5e1' }}>To:</strong> {SAMPLE_DATA.firstName} {SAMPLE_DATA.lastName} &lt;{SAMPLE_DATA.email}&gt;
                    </Typography>
                  </Box>

                  {/* Rendered HTML Sandbox */}
                  <Box
                    sx={{
                      flexGrow: 1,
                      minHeight: 460,
                      display: 'flex',
                      justifyContent: 'center',
                      bgcolor: '#070b14',
                      p: 2,
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      overflow: 'auto',
                    }}
                  >
                    <Box
                      sx={{
                        width: previewDevice === 'mobile' ? '360px' : '100%',
                        maxWidth: '680px',
                        bgcolor: '#ffffff',
                        color: '#000000',
                        borderRadius: previewDevice === 'mobile' ? '16px' : '8px',
                        overflow: 'hidden',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <iframe
                        title="email-preview"
                        srcDoc={renderedPreview}
                        style={{
                          width: '100%',
                          height: '100%',
                          minHeight: '480px',
                          border: 'none',
                          display: 'block',
                        }}
                      />
                    </Box>
                  </Box>

                </CardContent>
              </Card>
            </Grid>

          </Grid>

        </Container>
        <Footer />
      </Box>
    </Box>
  );
};

export default TemplateComposer;
