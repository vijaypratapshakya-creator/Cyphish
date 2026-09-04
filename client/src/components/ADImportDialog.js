import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  TextField,
  Chip,
  Checkbox,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormControl,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Business as BusinessIcon,
  FolderSpecial as FolderIcon,
  Groups as GroupsIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getDirectoryMetadata, queryDirectoryTargets, searchDirectoryUsers } from '../services/systemService';
import { dialogPaperProps, gradientHeaderStyles } from '../utils/styles';

const ADImportDialog = ({ open, onClose, onImport, loading }) => {
  const navigate = useNavigate();
  const [adLoading, setAdLoading] = useState(false);
  const [adMeta, setAdMeta] = useState({ ldapEnabled: false, departments: [], ous: [], groups: [], syncedCount: 0 });
  const [adMode, setAdMode] = useState('filter'); // 'filter', 'search', 'all'

  // Filter selection
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedOus, setSelectedOus] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [matchedCount, setMatchedCount] = useState(null);
  const [checkingCount, setCheckingCount] = useState(false);

  // User search selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);

  useEffect(() => {
    if (open) {
      loadMeta();
      setSelectedDepartments([]);
      setSelectedOus([]);
      setSelectedGroups([]);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedEmails([]);
      setMatchedCount(null);
    }
  }, [open]);

  const loadMeta = async () => {
    try {
      setAdLoading(true);
      const res = await getDirectoryMetadata();
      if (res.success && res.data) {
        setAdMeta(res.data);
      }
    } catch (err) {
      console.warn('Metadata load error:', err.message);
    } finally {
      setAdLoading(false);
    }
  };

  useEffect(() => {
    if (adMode === 'filter' && (selectedDepartments.length > 0 || selectedOus.length > 0 || selectedGroups.length > 0)) {
      updateCount();
    } else if (adMode === 'all') {
      setMatchedCount(adMeta.syncedCount);
    } else {
      setMatchedCount(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartments, selectedOus, selectedGroups, adMode, adMeta.syncedCount]);

  const updateCount = async () => {
    try {
      setCheckingCount(true);
      const res = await queryDirectoryTargets({
        departments: selectedDepartments.join(','),
        ous: selectedOus.join(','),
        groups: selectedGroups.join(','),
      });
      if (res.success && res.data) {
        setMatchedCount(res.data.count);
      }
    } catch (err) {
      console.warn('Count error:', err.message);
    } finally {
      setCheckingCount(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await searchDirectoryUsers({ query: searchQuery.trim() });
      if (res.success) {
        setSearchResults(res.data || []);
      }
    } catch (err) {
      console.warn('Search error:', err.message);
    } finally {
      setSearching(false);
    }
  };

  const toggleEmail = (email) => {
    const norm = email.toLowerCase();
    if (selectedEmails.includes(norm)) {
      setSelectedEmails(selectedEmails.filter((e) => e !== norm));
    } else {
      setSelectedEmails([...selectedEmails, norm]);
    }
  };

  const selectAllSearchResults = () => {
    const all = searchResults.map((u) => u.email.toLowerCase()).filter(Boolean);
    setSelectedEmails(Array.from(new Set([...selectedEmails, ...all])));
  };

  const deselectAllSearchResults = () => {
    const set = new Set(searchResults.map((u) => u.email.toLowerCase()));
    setSelectedEmails(selectedEmails.filter((e) => !set.has(e)));
  };

  const handleSubmit = () => {
    const payload = {
      importMode: adMode,
      departments: selectedDepartments,
      ous: selectedOus,
      groups: selectedGroups,
      selectedUserEmails: adMode === 'search' ? selectedEmails : [],
    };
    onImport(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={dialogPaperProps}>
      <DialogTitle sx={gradientHeaderStyles}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BusinessIcon sx={{ fontSize: 26 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Import from Active Directory / LDAP
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3, pt: 2 }}>
        {adLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} sx={{ color: '#3b82f6' }} />
          </Box>
        ) : !adMeta.ldapEnabled ? (
          <Alert
            severity="info"
            sx={{
              mt: 2,
              bgcolor: 'rgba(59, 130, 246, 0.1)',
              color: '#93c5fd',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '10px',
            }}
            action={
              <Button
                size="small"
                variant="contained"
                startIcon={<SettingsIcon />}
                onClick={() => {
                  onClose();
                  navigate('/console/settings');
                }}
                sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 700 }}
              >
                Go to Settings
              </Button>
            }
          >
            Active Directory integration is currently disabled. Configure corporate LDAPS in System Settings to enable directory imports.
          </Alert>
        ) : (
          <Box sx={{ mt: 1 }}>
            <FormControl component="fieldset" sx={{ mb: 2.5, width: '100%' }}>
              <RadioGroup
                row
                value={adMode}
                onChange={(e) => setAdMode(e.target.value)}
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

            {/* Sub-Mode 1: Filter by Department / OU / Group */}
            {adMode === 'filter' && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    options={adMeta.departments}
                    value={selectedDepartments}
                    onChange={(e, val) => setSelectedDepartments(val)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Filter by Departments (e.g. Finance, HR, IT)"
                        placeholder="Select departments..."
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option}
                          size="small"
                          label={option}
                          icon={<BusinessIcon sx={{ fontSize: '0.9rem !important' }} />}
                          sx={{ bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 600 }}
                        />
                      ))
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={adMeta.ous}
                    value={selectedOus}
                    onChange={(e, val) => setSelectedOus(val)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Filter by Organizational Units (OUs)"
                        placeholder="Select OUs..."
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option}
                          size="small"
                          label={option}
                          icon={<FolderIcon sx={{ fontSize: '0.9rem !important' }} />}
                          sx={{ bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 600 }}
                        />
                      ))
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={adMeta.groups}
                    value={selectedGroups}
                    onChange={(e, val) => setSelectedGroups(val)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Filter by Security Groups"
                        placeholder="Select groups..."
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option}
                          size="small"
                          label={option}
                          icon={<GroupsIcon sx={{ fontSize: '0.9rem !important' }} />}
                          sx={{ bgcolor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 600 }}
                        />
                      ))
                    }
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ bgcolor: '#0b0f19', p: 1.5, borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      Target preview matching selected criteria:
                    </Typography>
                    <Chip
                      size="small"
                      label={checkingCount ? 'Calculating...' : `${matchedCount ?? 0} Matched Targets`}
                      icon={<CheckCircleIcon sx={{ fontSize: '0.9rem !important' }} />}
                      sx={{ bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 700 }}
                    />
                  </Box>
                </Grid>
              </Grid>
            )}

            {/* Sub-Mode 2: Search & Pick Users */}
            {adMode === 'search' && (
              <Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by name, username, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    startIcon={searching ? <CircularProgress size={14} sx={{ color: '#3b82f6' }} /> : <SearchIcon />}
                    sx={{ borderColor: '#3b82f6', color: '#60a5fa', fontWeight: 600, px: 2.5, whiteSpace: 'nowrap' }}
                  >
                    {searching ? 'Searching...' : 'Search AD'}
                  </Button>
                </Box>

                {searchResults.length > 0 && (
                  <Box sx={{ bgcolor: '#0b0f19', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', p: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, px: 1 }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>
                        {searchResults.length} Results ({selectedEmails.length} Selected)
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" onClick={selectAllSearchResults} sx={{ color: '#60a5fa', fontSize: '0.72rem' }}>
                          Select All
                        </Button>
                        <Button size="small" onClick={deselectAllSearchResults} sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                          Deselect All
                        </Button>
                      </Box>
                    </Box>

                    <TableContainer sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox"></TableCell>
                            <TableCell sx={{ color: '#94a3b8', fontWeight: 700 }}>Name</TableCell>
                            <TableCell sx={{ color: '#94a3b8', fontWeight: 700 }}>Email</TableCell>
                            <TableCell sx={{ color: '#94a3b8', fontWeight: 700 }}>Department</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {searchResults.map((u, i) => {
                            const isSelected = selectedEmails.includes(u.email.toLowerCase());
                            return (
                              <TableRow
                                key={i}
                                hover
                                onClick={() => toggleEmail(u.email)}
                                sx={{ cursor: 'pointer', bgcolor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent' }}
                              >
                                <TableCell padding="checkbox">
                                  <Checkbox checked={isSelected} size="small" sx={{ color: '#3b82f6' }} />
                                </TableCell>
                                <TableCell sx={{ color: '#f8fafc', fontWeight: 600 }}>{u.firstName} {u.lastName}</TableCell>
                                <TableCell sx={{ color: '#94a3b8' }}>{u.email}</TableCell>
                                <TableCell sx={{ color: '#cbd5e1' }}>{u.department || 'General'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </Box>
            )}

            {/* Sub-Mode 3: Entire Directory */}
            {adMode === 'all' && (
              <Box sx={{ bgcolor: '#0b0f19', p: 2.5, borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.3)', textAlign: 'center' }}>
                <BusinessIcon sx={{ fontSize: 36, color: '#3b82f6', mb: 0.5 }} />
                <Typography variant="subtitle1" sx={{ color: '#f8fafc', fontWeight: 700 }}>
                  Entire Corporate Active Directory Target Pool
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5, mb: 1.5 }}>
                  This will append all <strong>{adMeta.syncedCount}</strong> synchronized domain users to this audience (duplicates automatically skipped).
                </Typography>
                <Chip size="small" label={`${adMeta.syncedCount} Active Targets`} sx={{ bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 700 }} />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 0 }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: '#94a3b8' }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            loading ||
            !adMeta.ldapEnabled ||
            (adMode === 'search' && selectedEmails.length === 0) ||
            (adMode === 'filter' && matchedCount === 0)
          }
          sx={{
            bgcolor: '#3b82f6',
            color: '#fff',
            fontWeight: 700,
            borderRadius: '8px',
            '&:hover': { bgcolor: '#2563eb' },
          }}
        >
          {loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Import Contacts'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ADImportDialog;
