import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Rating,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EmailIcon from '@mui/icons-material/Email';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StarIcon from '@mui/icons-material/Star';
import { useNavigate } from 'react-router-dom';
import PreviewTemplate from './PreviewTemplate';
import DeleteTemplate from './DeleteTemplate';

const CATEGORIES = ['All Categories', 'IT & Security', 'Finance & Payroll', 'HR & Benefits', 'Executive / Spear', 'Urgent Notice'];

const SavedTemplates = ({ templates, loading, error }) => {
  const navigate = useNavigate();
  const [templateList, setTemplateList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  useEffect(() => {
    if (templates) {
      setTemplateList(templates);
    }
  }, [templates]);

  const handleDeleteSuccess = (id) => {
    setTemplateList((prev) => prev.filter((t) => t._id !== id));
  };

  const filteredTemplates = templateList.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      selectedCategory === 'All Categories' ||
      (t.category && t.category.toLowerCase() === selectedCategory.toLowerCase());
    return matchesSearch && matchesCat;
  });

  const getCategoryColor = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'finance & payroll':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'it & security':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' };
      case 'hr & benefits':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'executive / spear':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  return (
    <Box>
      {/* Search & Filter Bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search templates by scenario name or subject..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 260, bgcolor: '#0b0f19' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#64748b' }} />
              </InputAdornment>
            ),
          }}
        />

        <Select
          size="small"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          sx={{ minWidth: 180, bgcolor: '#0b0f19' }}
        >
          {CATEGORIES.map((cat) => (
            <MenuItem key={cat} value={cat}>
              {cat}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#3b82f6' }} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          {error}
        </Alert>
      ) : filteredTemplates.length === 0 ? (
        <Card sx={{ bgcolor: '#111827', border: '1px dashed rgba(255, 255, 255, 0.15)', p: 6, textAlign: 'center', borderRadius: '16px' }}>
          <EmailIcon sx={{ fontSize: 48, color: '#64748b', mb: 1.5 }} />
          <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 600 }}>
            No Matching Email Templates Found
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1, mb: 3 }}>
            Create a custom HTML scenario or choose from our pre-built threat library.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/console/templates/new')}
            sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 700 }}
          >
            Create New Template
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredTemplates.map((template) => {
            const catStyle = getCategoryColor(template.category || template.type);
            const difficulty = template.difficulty || 3;

            return (
              <Grid item xs={12} md={6} lg={4} key={template._id}>
                <Card
                  sx={{
                    bgcolor: '#111827',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    transition: 'all 0.25s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%',
                    '&:hover': {
                      borderColor: 'rgba(59, 130, 246, 0.4)',
                      transform: 'translateY(-3px)',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Chip
                        size="small"
                        label={template.category || template.type || 'Phishing Drill'}
                        sx={{
                          bgcolor: catStyle.bg,
                          color: catStyle.text,
                          border: `1px solid ${catStyle.border}`,
                          fontWeight: 700,
                          fontSize: '0.72rem',
                        }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                          Difficulty:
                        </Typography>
                        <Rating
                          value={difficulty}
                          readOnly
                          size="small"
                          emptyIcon={<StarIcon sx={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.9rem' }} />}
                          icon={<StarIcon sx={{ color: '#fbbf24', fontSize: '0.9rem' }} />}
                        />
                      </Box>
                    </Box>

                    <Typography variant="h6" sx={{ color: '#f8fafc', fontWeight: 700, mb: 0.5, lineHeight: 1.3 }}>
                      {template.name}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        color: '#94a3b8',
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        fontSize: '0.85rem',
                      }}
                    >
                      <strong>Subject:</strong> {template.subject}
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <PreviewTemplate template={template} />
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon sx={{ fontSize: '0.9rem !important' }} />}
                          onClick={() => navigate(`/console/templates/${template._id}/edit`)}
                          sx={{
                            borderColor: 'rgba(255, 255, 255, 0.15)',
                            color: '#cbd5e1',
                            fontSize: '0.75rem',
                            borderRadius: '8px',
                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)', borderColor: '#3b82f6', color: '#60a5fa' },
                          }}
                        >
                          Edit
                        </Button>
                      </Box>

                      <DeleteTemplate
                        template={template}
                        onDeleteSuccess={() => handleDeleteSuccess(template._id)}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default SavedTemplates;
