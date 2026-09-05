import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  TextField,
  Button,
  
  Card,
  CardContent,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
  Tabs,
  Tab,
  Chip,
  Checkbox,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormControl,
  
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  GroupAdd as GroupAddIcon,
  CheckCircle as CheckCircleIcon,
  Business as BusinessIcon,
  FolderSpecial as FolderIcon,
  Groups as GroupsIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  
} from '@mui/icons-material';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import { useNavigate } from 'react-router-dom';
import { useAudience } from '../../hooks/useAudience';
import { getDirectoryMetadata, queryDirectoryTargets, searchDirectoryUsers, triggerDirectorySyncNow } from '../../services/systemService';
import { Sync as SyncIcon } from '@mui/icons-material';

const CreateAudience = () => {
  const [audienceName, setAudienceName] = useState('');
  const [validationError, setValidationError] = useState(false);
  const [importTab, setImportTab] = useState(0); // 0 = CSV, 1 = Active Directory

  // CSV Mode State
  const [file, setFile] = useState(null);

  // Active Directory Mode State
  const [adLoading, setAdLoading] = useState(false);
  const [syncingAd, setSyncingAd] = useState(false);
  const [adSyncMessage, setAdSyncMessage] = useState(null);
  const [adMeta, setAdMeta] = useState({ ldapEnabled: false, departments: [], ous: [], groups: [], syncedCount: 0 });
  const [adMode, setAdMode] = useState('filter'); // 'filter', 'search', 'all'
  
  // AD Filter Selection
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedOus, setSelectedOus] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [matchedAdCount, setMatchedAdCount] = useState(null);
  const [checkingMatchedCount, setCheckingMatchedCount] = useState(false);

  // AD User Search Selection
  const [adSearchQuery, setAdSearchQuery] = useState('');
  const [adSearching, setAdSearching] = useState(false);
  const [selectedUserEmails, setSelectedUserEmails] = useState([]);

  const { createAudience, createAudienceFromAD, loading, error } = useAudience();
  const navigate = useNavigate();

  useEffect(() => {
    loadDirectoryMetadata();
  }, []);

  const loadDirectoryMetadata = async () => {
    try {
      setAdLoading(true);
      const res = await getDirectoryMetadata();
      if (res.success && res.data) {
        setAdMeta(res.data);
      }
    } catch (err) {
      console.warn('Failed to load directory metadata:', err.message);
    } finally {
      setAdLoading(false);
    }
  };

  
  // Unified Search State for AD
  const [debouncedAdQuery, setDebouncedAdQuery] = useState('');
  const [unifiedAdResults, setUnifiedAdResults] = useState([]);
  const [adPage, setAdPage] = useState(0);
  const rowsPerPage = 15;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAdQuery(adSearchQuery);
      setAdPage(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [adSearchQuery]);

  useEffect(() => {
    let active = true;
    const fetchResults = async () => {
      if (!adMeta.ldapEnabled || importTab !== 1) return;
      if (adMode === 'filter') {
        const q = debouncedAdQuery.toLowerCase();
        const depts = (adMeta.departments || []).filter(d => d.toLowerCase().includes(q)).map(d => ({ id: `dept_${d}`, name: d, type: 'Department', rawValue: d }));
        const ous = (adMeta.ous || []).filter(o => o.toLowerCase().includes(q)).map(o => ({ id: `ou_${o}`, name: o, type: 'OU', rawValue: o }));
        const groups = (adMeta.groups || []).filter(g => g.toLowerCase().includes(q)).map(g => ({ id: `group_${g}`, name: g, type: 'Group', rawValue: g }));
        if (active) {
          setUnifiedAdResults([...depts, ...ous, ...groups]);
          setAdSearching(false);
        }
      } else {
        setAdSearching(true);
        try {
          const res = await searchDirectoryUsers({ query: debouncedAdQuery.trim() });
          if (active && res.success) {
            setUnifiedAdResults(res.data || []);
          }
        } catch (err) {
          console.warn('Search error:', err.message);
        } finally {
          if (active) setAdSearching(false);
        }
      }
    };
    fetchResults();
    return () => { active = false; };
  }, [debouncedAdQuery, adMode, adMeta, importTab]);

  const toggleFilterItem = (item) => {
    if (item.type === 'Department') {
      if (selectedDepartments.includes(item.rawValue)) setSelectedDepartments(selectedDepartments.filter(d => d !== item.rawValue));
      else setSelectedDepartments([...selectedDepartments, item.rawValue]);
    } else if (item.type === 'OU') {
      if (selectedOus.includes(item.rawValue)) setSelectedOus(selectedOus.filter(d => d !== item.rawValue));
      else setSelectedOus([...selectedOus, item.rawValue]);
    } else if (item.type === 'Group') {
      if (selectedGroups.includes(item.rawValue)) setSelectedGroups(selectedGroups.filter(d => d !== item.rawValue));
      else setSelectedGroups([...selectedGroups, item.rawValue]);
    }
  };

  const isFilterItemSelected = (item) => {
    if (item.type === 'Department') return selectedDepartments.includes(item.rawValue);
    if (item.type === 'OU') return selectedOus.includes(item.rawValue);
    if (item.type === 'Group') return selectedGroups.includes(item.rawValue);
    return false;
  };

  const displayedAdResults = unifiedAdResults.slice(adPage * rowsPerPage, adPage * rowsPerPage + rowsPerPage);

  const getPlaceholder = () => {
    if (adMode === 'filter') return "Search Departments, OUs, or Groups by name...";
    if (adMode === 'search') return "Search users by name, username, or email...";
    return "Search entire directory to preview users...";
  };

const handleSyncAdNow = async () => {
    try {
      setSyncingAd(true);
      setAdSyncMessage(null);
      const res = await triggerDirectorySyncNow();
      if (res.success) {
        setAdSyncMessage({ severity: 'success', text: res.message || 'Active Directory synchronization complete!' });
        await loadDirectoryMetadata();
      }
    } catch (err) {
      setAdSyncMessage({ severity: 'error', text: err.response?.data?.message || err.message || 'Directory synchronization failed.' });
    } finally {
      setSyncingAd(false);
    }
  };

  // Recalculate matched AD targets whenever filters change
  useEffect(() => {
    if (adMode === 'filter' && (selectedDepartments.length > 0 || selectedOus.length > 0 || selectedGroups.length > 0)) {
      updateMatchedCount();
    } else if (adMode === 'all') {
      setMatchedAdCount(adMeta.syncedCount);
    } else {
      setMatchedAdCount(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartments, selectedOus, selectedGroups, adMode, adMeta.syncedCount]);

  const updateMatchedCount = async () => {
    try {
      setCheckingMatchedCount(true);
      const res = await queryDirectoryTargets({
        departments: selectedDepartments.join(','),
        ous: selectedOus.join(','),
        groups: selectedGroups.join(','),
      });
      if (res.success && res.data) {
        setMatchedAdCount(res.data.count);
      }
    } catch (err) {
      console.warn('Count update error:', err.message);
    } finally {
      setCheckingMatchedCount(false);
    }
  };

    const toggleSelectUserEmail = (email) => {
    const normalized = email.toLowerCase();
    if (selectedUserEmails.includes(normalized)) {
      setSelectedUserEmails(selectedUserEmails.filter((e) => e !== normalized));
    } else {
      setSelectedUserEmails([...selectedUserEmails, normalized]);
    }
  };

  const handleSelectAllSearchResults = () => {
    const allEmails = unifiedAdResults.map((u) => u.email.toLowerCase()).filter(Boolean);
    const newSelected = Array.from(new Set([...selectedUserEmails, ...allEmails]));
    setSelectedUserEmails(newSelected);
  };

  const handleDeselectAllSearchResults = () => {
    const resultEmailSet = new Set(unifiedAdResults.map((u) => u.email.toLowerCase()));
    setSelectedUserEmails(selectedUserEmails.filter((e) => !resultEmailSet.has(e)));
  };

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

    if (importTab === 0) {
      // CSV Upload Mode
      const formData = new FormData();
      formData.append('name', audienceName.trim());
      if (file) {
        formData.append('file', file);
      }

      const response = await createAudience(formData);
      if (response.success) {
        navigate(`/console/audience/${response.data._id}`);
      }
    } else {
      // Active Directory Import Mode
      const payload = {
        name: audienceName.trim(),
        importMode: adMode,
        departments: selectedDepartments,
        ous: selectedOus,
        groups: selectedGroups,
        selectedUserEmails: adMode === 'search' ? selectedUserEmails : [],
      };

      const response = await createAudienceFromAD(payload);
      if (response.success) {
        navigate(`/console/audience/${response.data._id}`);
      }
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
                Define simulation targets by uploading a CSV file or importing directly from Active Directory OUs, Departments, and Groups.
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
                    <GroupAddIcon sx={{ color: '#3b82f6' }} /> Audience Group Details
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

                {/* Import Source Tabs */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700, mb: 1.5 }}>
                    Select Target Population Source
                  </Typography>
                  <Tabs
                    value={importTab}
                    onChange={(e, val) => setImportTab(val)}
                    sx={{
                      bgcolor: '#0b0f19',
                      borderRadius: '12px',
                      p: 0.5,
                      border: '1px solid rgba(255,255,255,0.06)',
                      '& .MuiTab-root': {
                        color: '#94a3b8',
                        fontWeight: 600,
                        textTransform: 'none',
                        minHeight: 44,
                        borderRadius: '8px',
                        '&.Mui-selected': { color: '#60a5fa', bgcolor: 'rgba(59, 130, 246, 0.15)' },
                      },
                      '& .MuiTabs-indicator': { display: 'none' },
                    }}
                  >
                    <Tab icon={<CloudUploadIcon sx={{ mr: 1, fontSize: '1.2rem' }} />} iconPosition="start" label="📁 Import from CSV File" />
                    <Tab icon={<BusinessIcon sx={{ mr: 1, fontSize: '1.2rem' }} />} iconPosition="start" label="🏢 Active Directory / LDAP Import" />
                  </Tabs>
                </Box>

                {/* Tab 0: CSV Upload */}
                {importTab === 0 && (
                  <Box sx={{ mb: 4 }}>
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
                            or browse from your local computer
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
                )}

                {/* Tab 1: Active Directory Import */}
                {importTab === 1 && (
                  <Box sx={{ mb: 4 }}>
                    {!adMeta.ldapEnabled ? (
                      <Alert
                        severity="info"
                        sx={{
                          bgcolor: 'rgba(59, 130, 246, 0.1)',
                          color: '#93c5fd',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          p: 2,
                          borderRadius: '12px',
                        }}
                        action={
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<SettingsIcon />}
                            onClick={() => navigate('/console/settings')}
                            sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 700 }}
                          >
                            Configure AD
                          </Button>
                        }
                      >
                        Active Directory integration is currently disabled. Connect your corporate LDAPS server in System Settings to automatically discover and group target users.
                      </Alert>
                    ) : (
                      <Box>
                        {/* AD Header Bar with Live Sync Button */}
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 1.5,
                            bgcolor: '#0b0f19',
                            p: 2,
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.06)',
                            mb: 2.5,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <BusinessIcon sx={{ color: '#3b82f6', fontSize: '1.6rem' }} />
                            <Box>
                              <Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                                Active Directory Connected
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                {adMeta.syncedCount} targets synchronized • {adMeta.departments.length} Depts • {adMeta.ous.length} OUs
                              </Typography>
                            </Box>
                          </Box>

                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={syncingAd || adLoading ? <CircularProgress size={14} sx={{ color: '#3b82f6' }} /> : <SyncIcon />}
                            onClick={handleSyncAdNow}
                            disabled={syncingAd || adLoading}
                            sx={{
                              borderColor: 'rgba(59, 130, 246, 0.5)',
                              color: '#60a5fa',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' },
                            }}
                          >
                            {syncingAd ? 'Synchronizing AD...' : 'Sync Active Directory Now'}
                          </Button>
                        </Box>

                        {adSyncMessage && (
                          <Alert
                            severity={adSyncMessage.severity}
                            onClose={() => setAdSyncMessage(null)}
                            sx={{
                              mb: 2.5,
                              bgcolor: adSyncMessage.severity === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: adSyncMessage.severity === 'success' ? '#34d399' : '#f87171',
                              border: adSyncMessage.severity === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                            }}
                          >
                            {adSyncMessage.text}
                          </Alert>
                        )}

                        {adMeta.syncedCount === 0 && !syncingAd && (
                          <Alert
                            severity="warning"
                            sx={{
                              mb: 2.5,
                              bgcolor: 'rgba(245, 158, 11, 0.1)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              borderRadius: '10px',
                            }}
                            action={
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<SyncIcon />}
                                onClick={handleSyncAdNow}
                                sx={{ bgcolor: '#f59e0b', color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#d97706' } }}
                              >
                                Sync Now
                              </Button>
                            }
                          >
                            0 users are currently cached. Click "Sync Now" to pull all domain users and organizational units into CyPhish.
                          </Alert>
                        )}

                        {/* AD Import Sub-Mode Selector */}
                        <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
                          <RadioGroup
                            row
                            value={adMode}
                            onChange={(e) => {
                              setAdMode(e.target.value);
                              setAdSearchQuery('');
                              setAdPage(0);
                            }}
                            sx={{
                              bgcolor: '#0b0f19',
                              p: 1,
                              borderRadius: '10px',
                              border: '1px solid rgba(255,255,255,0.06)',
                              gap: 2,
                            }}
                          >
                            <FormControlLabel
                              value="filter"
                              control={<Radio sx={{ color: '#3b82f6', '&.Mui-checked': { color: '#60a5fa' } }} />}
                              label={<Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 600 }}>🏢 Filter by Dept / OU / Group</Typography>}
                            />
                            <FormControlLabel
                              value="search"
                              control={<Radio sx={{ color: '#3b82f6', '&.Mui-checked': { color: '#60a5fa' } }} />}
                              label={<Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 600 }}>🔍 Search & Pick Users</Typography>}
                            />
                            <FormControlLabel
                              value="all"
                              control={<Radio sx={{ color: '#3b82f6', '&.Mui-checked': { color: '#60a5fa' } }} />}
                              label={<Typography variant="body2" sx={{ color: '#f8fafc', fontWeight: 600 }}>🌐 Entire Directory ({adMeta.syncedCount} Users)</Typography>}
                            />
                          </RadioGroup>
                        </FormControl>

                        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder={getPlaceholder()}
                            value={adSearchQuery}
                            onChange={(e) => setAdSearchQuery(e.target.value)}
                            InputProps={{
                              startAdornment: adSearching ? (
                                <CircularProgress size={16} sx={{ color: '#3b82f6', mr: 1 }} />
                              ) : (
                                <SearchIcon sx={{ color: '#94a3b8', mr: 1, fontSize: 20 }} />
                              )
                            }}
                          />
                        </Box>

                        <Box sx={{ bgcolor: '#0b0f19', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', p: 1 }}>
                          {/* Header and Controls */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, px: 1 }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>
                              {unifiedAdResults.length} Results
                              {adMode === 'search' && ` (${selectedUserEmails.length} Selected)`}
                              {adMode === 'filter' && ` (${selectedDepartments.length + selectedOus.length + selectedGroups.length} Selected)`}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              {adMode === 'search' && (
                                <>
                                  <Button size="small" onClick={handleSelectAllSearchResults} sx={{ color: '#60a5fa', fontSize: '0.72rem' }}>
                                    Select All
                                  </Button>
                                  <Button size="small" onClick={handleDeselectAllSearchResults} sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                                    Deselect All
                                  </Button>
                                </>
                              )}
                              {adMode === 'all' && (
                                <Button
                                  size="small"
                                  startIcon={syncingAd ? <CircularProgress size={14} sx={{ color: '#3b82f6' }} /> : <SyncIcon />}
                                  onClick={handleSyncAdNow}
                                  disabled={syncingAd}
                                  sx={{ color: '#60a5fa', fontSize: '0.72rem' }}
                                >
                                  {syncingAd ? 'Syncing...' : 'Force Sync AD'}
                                </Button>
                              )}
                            </Box>
                          </Box>

                          <TableContainer sx={{ minHeight: 250, maxHeight: 350, overflowY: 'auto' }}>
                            <Table size="small" stickyHeader>
                              <TableHead>
                                <TableRow>
                                  {adMode !== 'all' && <TableCell padding="checkbox" sx={{ bgcolor: '#0b0f19' }}></TableCell>}
                                  <TableCell sx={{ color: '#94a3b8', fontWeight: 700, bgcolor: '#0b0f19' }}>Name</TableCell>
                                  {adMode === 'filter' ? (
                                    <TableCell sx={{ color: '#94a3b8', fontWeight: 700, bgcolor: '#0b0f19' }}>Type</TableCell>
                                  ) : (
                                    <>
                                      <TableCell sx={{ color: '#94a3b8', fontWeight: 700, bgcolor: '#0b0f19' }}>Email</TableCell>
                                      <TableCell sx={{ color: '#94a3b8', fontWeight: 700, bgcolor: '#0b0f19' }}>Department</TableCell>
                                    </>
                                  )}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {displayedAdResults.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={adMode === 'filter' ? 3 : 4} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                                      No results found
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  displayedAdResults.map((item, i) => {
                                    if (adMode === 'filter') {
                                      const isSelected = isFilterItemSelected(item);
                                      return (
                                        <TableRow
                                          key={item.id}
                                          hover
                                          onClick={() => toggleFilterItem(item)}
                                          sx={{ cursor: 'pointer', bgcolor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent' }}
                                        >
                                          <TableCell padding="checkbox">
                                            <Checkbox checked={isSelected} size="small" sx={{ color: '#3b82f6' }} />
                                          </TableCell>
                                          <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>{item.name}</TableCell>
                                          <TableCell>
                                            <Chip
                                              size="small"
                                              label={item.type}
                                              icon={item.type === 'Department' ? <BusinessIcon sx={{ fontSize: '0.9rem !important' }} /> : item.type === 'OU' ? <FolderIcon sx={{ fontSize: '0.9rem !important' }} /> : <GroupsIcon sx={{ fontSize: '0.9rem !important' }} />}
                                              sx={{ 
                                                bgcolor: item.type === 'Department' ? 'rgba(59, 130, 246, 0.2)' : item.type === 'OU' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                                color: item.type === 'Department' ? '#60a5fa' : item.type === 'OU' ? '#34d399' : '#fbbf24', 
                                                fontWeight: 600 
                                              }}
                                            />
                                          </TableCell>
                                        </TableRow>
                                      );
                                    } else {
                                      // search or all mode (users)
                                      const isSelected = adMode === 'all' ? false : selectedUserEmails.includes(item.email?.toLowerCase());
                                      return (
                                        <TableRow
                                          key={i}
                                          hover
                                          onClick={() => { if (adMode !== 'all' && item.email) toggleSelectUserEmail(item.email); }}
                                          sx={{ cursor: adMode !== 'all' && item.email ? 'pointer' : 'default', bgcolor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent' }}
                                        >
                                          {adMode !== 'all' && (
                                            <TableCell padding="checkbox">
                                              {item.email ? <Checkbox checked={isSelected} size="small" sx={{ color: '#3b82f6' }} /> : null}
                                            </TableCell>
                                          )}
                                          <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>{item.firstName} {item.lastName}</TableCell>
                                          <TableCell sx={{ color: '#94a3b8' }}>{item.email || 'N/A'}</TableCell>
                                          <TableCell sx={{ color: '#cbd5e1' }}>{item.department || 'General'}</TableCell>
                                        </TableRow>
                                      );
                                    }
                                  })
                                )}
                              </TableBody>
                            </Table>
                          </TableContainer>
                          <TablePagination
                            component="div"
                            count={unifiedAdResults.length}
                            page={adPage}
                            onPageChange={(e, newPage) => setAdPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            rowsPerPageOptions={[]}
                            sx={{
                              color: '#94a3b8',
                              '.MuiTablePagination-selectLabel, .MuiTablePagination-input': { display: 'none' },
                              '.MuiTablePagination-actions button': { color: '#60a5fa' },
                            }}
                          />
                        </Box>

                        {adMode === 'filter' && (
                          <Box sx={{ mt: 2, bgcolor: '#0b0f19', p: 1.5, borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                              Target preview matching selected criteria:
                            </Typography>
                            <Chip
                              size="small"
                              label={checkingMatchedCount ? 'Calculating...' : `${matchedAdCount ?? 0} Matched Targets`}
                              icon={<CheckCircleIcon sx={{ fontSize: '0.9rem !important' }} />}
                              sx={{ bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 700 }}
                            />
                          </Box>
                        )}
                        
                        {adMode === 'all' && (
                          <Box sx={{ mt: 2, textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                              This will append all synchronized domain users to this audience (duplicates skipped).
                            </Typography>
                          </Box>
                        )}
</Box>
                    )}
                  </Box>
                )}

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
                    disabled={
                      loading ||
                      (importTab === 1 && !adMeta.ldapEnabled) ||
                      (importTab === 1 && adMode === 'search' && selectedUserEmails.length === 0) ||
                      (importTab === 1 && adMode === 'filter' && matchedAdCount === 0)
                    }
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

