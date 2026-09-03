import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  GroupAdd as GroupAddIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import { useNavigate } from 'react-router-dom';
import { useAudience } from '../../hooks/useAudience';

const CreateAudience = () => {
  const [audienceName, setAudienceName] = useState('');
  const [file, setFile] = useState(null);
  const [validationError, setValidationError] = useState(false);
  const { createAudience, loading, error } = useAudience();
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audienceName.trim()) {
      setValidationError(true);
      return;
    }

    const formData = new FormData();
    formData.append('name', audienceName.trim());
    if (file) {
      formData.append('file', file);
    }

    const response = await createAudience(formData);
    if (response.success) {
      navigate(`/console/audience/${response.data._id}`);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0b0f19' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="md" sx={{ flexGrow: 1, mt: '80px', mb: 4, px: { xs: 2, sm: 3 } }}>
          
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <IconButton
              onClick={() => navigate('/console/audience')}
              sx={{ color: '#94a3b8', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f8fafc', fontSize: { xs: '1.3rem', md: '1.6rem' } }}>
                Create Target Audience Group
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Define a recipient group and optionally upload employee lists with names, emails, and departments.
              </Typography>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              {error}
            </Alert>
          )}

          <Card sx={{ bgcolor: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
            <CardContent sx={{ p: 4 }}>
              <form onSubmit={handleSubmit}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GroupAddIcon sx={{ color: '#3b82f6' }} /> Group Details
                  </Typography>
                  <TextField
                    fullWidth
                    label="Audience Group Name"
                    placeholder="e.g. Q3 All-Hands Drill or Finance Dept Targets"
                    value={audienceName}
                    onChange={(e) => {
                      setAudienceName(e.target.value);
                      if (validationError) setValidationError(false);
                    }}
                    error={validationError}
                    helperText={validationError ? 'Audience name is required' : ''}
                    required
                  />
                </Box>

                <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

                {/* CSV Upload Section */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700, mb: 0.5 }}>
                    Import Target Contacts (Optional CSV)
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
                    Upload a CSV file containing columns: <code>Email</code>, <code>First Name</code>, <code>Last Name</code>, <code>Department</code>, <code>OU</code>, <code>Role</code>.
                  </Typography>

                  <Box
                    sx={{
                      border: '2px dashed rgba(59, 130, 246, 0.3)',
                      borderRadius: '12px',
                      p: 4,
                      textAlign: 'center',
                      bgcolor: file ? 'rgba(16, 185, 129, 0.05)' : 'rgba(59, 130, 246, 0.02)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#3b82f6',
                        bgcolor: 'rgba(59, 130, 246, 0.05)',
                      },
                    }}
                  >
                    {file ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <CheckCircleIcon sx={{ fontSize: 40, color: '#10b981' }} />
                        <Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 600 }}>
                          {file.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          ({(file.size / 1024).toFixed(1)} KB)
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => setFile(null)}
                          sx={{ color: '#ef4444', textTransform: 'none', mt: 1 }}
                        >
                          Remove File
                        </Button>
                      </Box>
                    ) : (
                      <Box>
                        <CloudUploadIcon sx={{ fontSize: 48, color: '#64748b', mb: 1 }} />
                        <Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 600, mb: 0.5 }}>
                          Drag and drop your employee CSV here
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
                          or browse from your local files
                        </Typography>
                        <Button
                          component="label"
                          variant="outlined"
                          sx={{
                            borderColor: 'rgba(59, 130, 246, 0.5)',
                            color: '#60a5fa',
                            fontWeight: 600,
                            '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' },
                          }}
                        >
                          Select CSV File
                          <input type="file" accept=".csv" hidden onChange={handleFileChange} />
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button
                    onClick={() => navigate('/console/audience')}
                    sx={{ color: '#94a3b8' }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    sx={{
                      bgcolor: '#3b82f6',
                      color: '#fff',
                      fontWeight: 700,
                      px: 3.5,
                      py: 1,
                      borderRadius: '10px',
                      '&:hover': { bgcolor: '#2563eb' },
                    }}
                  >
                    {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Create Audience'}
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>

        </Container>
        <Footer />
      </Box>
    </Box>
  );
};

export default CreateAudience;
