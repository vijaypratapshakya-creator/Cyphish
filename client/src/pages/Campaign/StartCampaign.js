import React, { useState } from 'react';
import {
  Typography,
  Container,
  Box,
  Button,
  Grid,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  IconButton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import { useResources } from '../../hooks/useResources';
import { usePrepareCampaign, useStartCampaign } from '../../hooks/useCampaign';

const STEPS = ['Drill Specification', 'Audience & Smart Targeting', 'Relay & Rate Limiting', 'Review & Launch'];

const StartCampaign = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedAudience, setSelectedAudience] = useState('');
  const [targetFilterType, setTargetFilterType] = useState('all'); // 'all', 'department', 'ou', 'group'
  const [targetFilterValue, setTargetFilterValue] = useState('');
  const [selectedSenderProfile, setSelectedSenderProfile] = useState('');
  const [emailConcurrency, setEmailConcurrency] = useState('5');
  const [timeDelay, setTimeDelay] = useState('1');

  const [isPreparing, setIsPreparing] = useState(false);
  const [preparedCampaignId, setPreparedCampaignId] = useState(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchSuccess, setLaunchSuccess] = useState(false);

  const { audiences, senderProfiles, templates } = useResources();
  const { prepareCampaign, error: prepareError } = usePrepareCampaign();
  const { startCampaign, error: startError } = useStartCampaign();

  const currentAudienceObj = audiences?.find((a) => a._id === selectedAudience);
  const currentTemplateObj = templates?.find((t) => t._id === selectedTemplate);
  const currentProfileObj = senderProfiles?.find((p) => p._id === selectedSenderProfile);

  // Extract unique departments, OUs, and groups from the selected audience
  const departmentsInAudience = [...new Set(currentAudienceObj?.contacts?.map((c) => c.department).filter(Boolean))];
  const ousInAudience = [...new Set(currentAudienceObj?.contacts?.map((c) => c.ou).filter(Boolean))];
  const groupsInAudience = [...new Set(currentAudienceObj?.contacts?.flatMap((c) => c.directoryGroups || []).filter(Boolean))];

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handlePrepareAndAuthorize = async () => {
    setIsPreparing(true);
    const campaignData = {
      name: campaignName.trim(),
      audience: selectedAudience,
      senderProfile: selectedSenderProfile,
      template: selectedTemplate,
      emailConcurrency: Number(emailConcurrency) || 5,
      timeDelay: Number(timeDelay) || 1,
      targetFilter: {
        type: targetFilterType,
        value: targetFilterValue,
      },
    };

    const response = await prepareCampaign(campaignData);
    setIsPreparing(false);

    if (response?.success) {
      setPreparedCampaignId(response.data._id);
      handleNext();
    }
  };

  const handleExecuteLaunch = async () => {
    if (!preparedCampaignId) return;
    setIsLaunching(true);
    const res = await startCampaign(preparedCampaignId);
    setIsLaunching(false);
    if (res?.success) {
      setLaunchSuccess(true);
      setTimeout(() => {
        navigate(`/console/campaign/${preparedCampaignId}`);
      }, 1200);
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
              onClick={() => navigate('/console/campaign')}
              sx={{ color: '#94a3b8', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f8fafc', fontSize: { xs: '1.3rem', md: '1.6rem' } }}>
                Phishing Simulation Wizard
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                4-step automated drill deployment with granular Active Directory and department targeting.
              </Typography>
            </Box>
          </Box>

          {/* Stepper */}
          <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', mb: 3, p: 2 }}>
            <Stepper
              activeStep={activeStep}
              alternativeLabel
              sx={{
                '& .MuiStepLabel-label': { color: '#94a3b8', fontWeight: 600, fontSize: '0.82rem' },
                '& .MuiStepLabel-label.Mui-active': { color: '#60a5fa', fontWeight: 700 },
                '& .MuiStepLabel-label.Mui-completed': { color: '#34d399', fontWeight: 700 },
                '& .MuiStepIcon-root': { color: '#1e293b' },
                '& .MuiStepIcon-root.Mui-active': { color: '#3b82f6' },
                '& .MuiStepIcon-root.Mui-completed': { color: '#10b981' },
              }}
            >
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Card>

          {(prepareError || startError) && (
            <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              {prepareError || startError}
            </Alert>
          )}

          {/* Step 1: Specs & Scenario */}
          {activeStep === 0 && (
            <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 2 }}>
                  Step 1: Mission Specs & Scenario Selection
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Simulation Campaign Name"
                      placeholder="e.g. 2026-Q3 SOC Security Drill #1"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      required
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: '#94a3b8' }}>Select Phishing Scenario Template</InputLabel>
                      <Select
                        value={selectedTemplate}
                        label="Select Phishing Scenario Template"
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        sx={{ bgcolor: '#0b0f19' }}
                      >
                        {templates?.map((t) => (
                          <MenuItem key={t._id} value={t._id}>
                            {t.name} — ({t.category || 'General'} | Difficulty: {t.difficulty || 3}/5)
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {currentTemplateObj && (
                    <Grid item xs={12}>
                      <Box sx={{ bgcolor: '#0b0f19', p: 2, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block', mb: 0.5 }}>
                          Selected Subject Line:
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#60a5fa', fontWeight: 600 }}>
                          {currentTemplateObj.subject}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!campaignName.trim() || !selectedTemplate}
                    sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 700, px: 3.5, borderRadius: '10px' }}
                  >
                    Next: Target Audience →
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Target Selection & Smart Filter */}
          {activeStep === 1 && (
            <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1 }}>
                  Step 2: Target Audience & Smart Department/OU Filter
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                  Target all employees in the list or filter down to specific organizational units, departments, or teams.
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: '#94a3b8' }}>Target Audience Group</InputLabel>
                      <Select
                        value={selectedAudience}
                        label="Target Audience Group"
                        onChange={(e) => {
                          setSelectedAudience(e.target.value);
                          setTargetFilterValue('');
                        }}
                        sx={{ bgcolor: '#0b0f19' }}
                      >
                        {audiences?.map((a) => (
                          <MenuItem key={a._id} value={a._id}>
                            {a.name} ({a.contacts?.length || 0} Contacts)
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {selectedAudience && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel sx={{ color: '#94a3b8' }}>Targeting Scope</InputLabel>
                          <Select
                            value={targetFilterType}
                            label="Targeting Scope"
                            onChange={(e) => {
                              setTargetFilterType(e.target.value);
                              setTargetFilterValue('');
                            }}
                            sx={{ bgcolor: '#0b0f19' }}
                          >
                            <MenuItem value="all">🎯 Target Entire Group (All Contacts)</MenuItem>
                            <MenuItem value="department">🏢 Filter by Department</MenuItem>
                            <MenuItem value="ou">🗂️ Filter by Active Directory OU</MenuItem>
                            <MenuItem value="group">👥 Filter by AD Security Group / Team</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      {targetFilterType === 'department' && (
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel sx={{ color: '#94a3b8' }}>Select Department</InputLabel>
                            <Select
                              value={targetFilterValue}
                              label="Select Department"
                              onChange={(e) => setTargetFilterValue(e.target.value)}
                              sx={{ bgcolor: '#0b0f19' }}
                            >
                              {departmentsInAudience.map((d) => (
                                <MenuItem key={d} value={d}>
                                  {d}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      )}

                      {targetFilterType === 'ou' && (
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel sx={{ color: '#94a3b8' }}>Select OU</InputLabel>
                            <Select
                              value={targetFilterValue}
                              label="Select OU"
                              onChange={(e) => setTargetFilterValue(e.target.value)}
                              sx={{ bgcolor: '#0b0f19' }}
                            >
                              {ousInAudience.map((ou) => (
                                <MenuItem key={ou} value={ou}>
                                  {ou}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      )}

                      {targetFilterType === 'group' && (
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel sx={{ color: '#94a3b8' }}>Select AD Group</InputLabel>
                            <Select
                              value={targetFilterValue}
                              label="Select AD Group"
                              onChange={(e) => setTargetFilterValue(e.target.value)}
                              sx={{ bgcolor: '#0b0f19' }}
                            >
                              {groupsInAudience.map((g) => (
                                <MenuItem key={g} value={g}>
                                  {g}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      )}
                    </>
                  )}
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                  <Button onClick={handleBack} sx={{ color: '#94a3b8' }}>
                    ← Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!selectedAudience}
                    sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 700, px: 3.5, borderRadius: '10px' }}
                  >
                    Next: Delivery Relay →
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Relay Station & Concurrency */}
          {activeStep === 2 && (
            <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1 }}>
                  Step 3: Delivery Relay & Throttle Rate Limiting
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                  Select the sending SMTP relay and configure spacing to bypass anti-spam burst rate-limits.
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: '#94a3b8' }}>Select SMTP Relay Profile</InputLabel>
                      <Select
                        value={selectedSenderProfile}
                        label="Select SMTP Relay Profile"
                        onChange={(e) => setSelectedSenderProfile(e.target.value)}
                        sx={{ bgcolor: '#0b0f19' }}
                      >
                        {senderProfiles?.map((p) => (
                          <MenuItem key={p._id} value={p._id}>
                            {p.senderName} ({p.host}:{p.port} {p.isDefault ? '— Default' : ''})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Delivery Concurrency (Parallel Workers)"
                      value={emailConcurrency}
                      onChange={(e) => setEmailConcurrency(e.target.value)}
                      helperText="Default: 5 concurrent threads"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Batch Delay (Seconds between sends)"
                      value={timeDelay}
                      onChange={(e) => setTimeDelay(e.target.value)}
                      helperText="Default: 1 second delay between messages"
                    />
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                  <Button onClick={handleBack} sx={{ color: '#94a3b8' }}>
                    ← Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handlePrepareAndAuthorize}
                    disabled={isPreparing || !selectedSenderProfile}
                    sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 700, px: 3.5, borderRadius: '10px' }}
                  >
                    {isPreparing ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Prepare Drill Review →'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review & One-Click Launch */}
          {activeStep === 3 && (
            <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <RocketLaunchIcon sx={{ fontSize: 48, color: '#10b981', mb: 1 }} />
                  <Typography variant="h5" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                    Drill Prepared & Ready for Launch
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 500, mx: 'auto', mt: 0.5 }}>
                    Review the simulation parameters below before activating the automated campaign.
                  </Typography>
                </Box>

                <Grid container spacing={2} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ bgcolor: '#0b0f19', p: 2, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Mission Name
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                        {campaignName}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ bgcolor: '#0b0f19', p: 2, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Scenario Template
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#60a5fa', fontWeight: 600 }}>
                        {currentTemplateObj?.name}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ bgcolor: '#0b0f19', p: 2, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Target Audience
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#34d399', fontWeight: 600 }}>
                        {currentAudienceObj?.name} {targetFilterValue ? `(${targetFilterType}: ${targetFilterValue})` : '(All Targets)'}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ bgcolor: '#0b0f19', p: 2, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        SMTP Relay Station
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                        {currentProfileObj?.senderName} ({currentProfileObj?.host})
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {launchSuccess && (
                  <Alert severity="success" sx={{ mb: 3, bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    Campaign launched successfully! Redirecting to live telemetry command center...
                  </Alert>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={handleBack} disabled={isLaunching || launchSuccess} sx={{ color: '#94a3b8' }}>
                    ← Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleExecuteLaunch}
                    disabled={isLaunching || launchSuccess}
                    sx={{
                      bgcolor: '#10b981',
                      color: '#fff',
                      fontWeight: 700,
                      px: 4,
                      py: 1.2,
                      borderRadius: '10px',
                      '&:hover': { bgcolor: '#059669' },
                    }}
                  >
                    {isLaunching ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Authorize & Launch Drill Now'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

        </Container>
        <Footer />
      </Box>
    </Box>
  );
};

export default StartCampaign;
