import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Container,
  Box,
  Button,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import EmailIcon from '@mui/icons-material/Email';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import PropTypes from 'prop-types';
import ImportTemplateDialog from './ImportTemplateDialog';
import SavedTemplates from './SavedTemplates';
import AIBuilder from './AIBuilder';
import { useTemplates } from '../../hooks/useTemplates';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`template-tabpanel-${index}`}
      aria-labelledby={`template-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3, px: 0, pb: 0 }}>{children}</Box>}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

const Templates = () => {
  const navigate = useNavigate();
  const [value, setValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createMenuAnchor, setCreateMenuAnchor] = useState(null);
  const createMenuOpen = Boolean(createMenuAnchor);

  const {
    templates,
    error,
    listLoading,
    fetchTemplateList,
  } = useTemplates();

  useEffect(() => {
    fetchTemplateList();
  }, []);

  const handleCreateMenuOpen = (event) => setCreateMenuAnchor(event.currentTarget);
  const handleCreateMenuClose = () => setCreateMenuAnchor(null);

  const handleWriteWithEditor = () => {
    handleCreateMenuClose();
    navigate('/console/templates/new');
  };

  const handleImportHtml = () => {
    handleCreateMenuClose();
    setDialogOpen(true);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0b0f19' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="xl" sx={{ flexGrow: 1, mt: '80px', mb: 4, px: { xs: 2, sm: 3 } }}>
          
          {/* Top Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: '#f8fafc',
                  fontSize: { xs: '1.4rem', md: '1.8rem' },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <EmailIcon sx={{ color: '#3b82f6', fontSize: '2rem' }} />
                Threat Scenario & Template Studio
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                Craft highly customized, multi-stage phishing simulation scenarios with zero HTML tag restrictions.
              </Typography>
            </Box>

            <Button
              variant="contained"
              endIcon={<KeyboardArrowDownIcon />}
              onClick={handleCreateMenuOpen}
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
              Author Scenario
            </Button>

            <Menu
              anchorEl={createMenuAnchor}
              open={createMenuOpen}
              onClose={handleCreateMenuClose}
              PaperProps={{
                sx: {
                  bgcolor: '#111827',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  minWidth: 200,
                }
              }}
            >
              <MenuItem onClick={handleWriteWithEditor} sx={{ color: '#f8fafc', py: 1.2 }}>
                <ListItemIcon sx={{ color: '#60a5fa' }}>
                  <EditNoteOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Full-Fidelity HTML Editor" secondary="Code or Markdown studio" secondaryTypographyProps={{ sx: { color: '#64748b', fontSize: '0.75rem' } }} />
              </MenuItem>
              <MenuItem onClick={handleImportHtml} sx={{ color: '#f8fafc', py: 1.2 }}>
                <ListItemIcon sx={{ color: '#34d399' }}>
                  <UploadFileOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Import Raw HTML / EML" secondary="Paste or upload raw file" secondaryTypographyProps={{ sx: { color: '#64748b', fontSize: '0.75rem' } }} />
              </MenuItem>
            </Menu>
          </Box>

          {/* Navigation Tabs */}
          <Box sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', mb: 2 }}>
            <Tabs
              value={value}
              onChange={(e, nv) => setValue(nv)}
              sx={{
                '& .MuiTab-root': {
                  color: '#94a3b8',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textTransform: 'none',
                  minHeight: 44,
                  '&.Mui-selected': {
                    color: '#60a5fa',
                  },
                },
                '& .MuiTabs-indicator': {
                  bgcolor: '#3b82f6',
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                },
              }}
            >
              <Tab label={`Scenario Library (${templates?.length || 0})`} />
              <Tab label="AI Scenario Generator" />
            </Tabs>
          </Box>

          {/* Tab 1: Library */}
          <TabPanel value={value} index={0}>
            <SavedTemplates
              templates={templates}
              loading={listLoading}
              error={error}
            />
          </TabPanel>

          {/* Tab 2: AI Builder */}
          <TabPanel value={value} index={1}>
            <AIBuilder />
          </TabPanel>

          {/* Import Modal */}
          <ImportTemplateDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onImportSuccess={() => {
              setDialogOpen(false);
              fetchTemplateList();
            }}
          />

        </Container>
        <Footer />
      </Box>
    </Box>
  );
};

export default Templates;
