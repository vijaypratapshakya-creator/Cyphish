import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
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
  Alert,
  CircularProgress,
  TablePagination,
} from '@mui/material';
import {
  Business as BusinessIcon,
  FolderSpecial as FolderIcon,
  Groups as GroupsIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Settings as SettingsIcon,
  Sync as SyncIcon,
  
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getDirectoryMetadata, queryDirectoryTargets, searchDirectoryUsers, triggerDirectorySyncNow } from '../services/systemService';
import { dialogPaperProps, gradientHeaderStyles } from '../utils/styles';

const ADImportDialog = ({ open, onClose, onImport, loading }) => {
  const navigate = useNavigate();
  const [adLoading, setAdLoading] = useState(false);
  const [syncingAd, setSyncingAd] = useState(false);
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
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [unifiedResults, setUnifiedResults] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  
  // Pagination
  const [page, setPage] = useState(0);
  const rowsPerPage = 15;

  useEffect(() => {
    if (open) {
      loadMeta();
      setSelectedDepartments([]);
      setSelectedOus([]);
      setSelectedGroups([]);
      setSearchQuery('');
      setDebouncedQuery('');
      setUnifiedResults([]);
      setSelectedEmails([]);
      setMatchedCount(null);
      setPage(0);
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

  const handleSyncAdNow = async () => {
    try {
      setSyncingAd(true);
      const res = await triggerDirectorySyncNow();
      if (res.success) {
        await loadMeta();
      }
    } catch (err) {
      console.warn('AD Sync error:', err.message);
    } finally {
      setSyncingAd(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch or compute results based on mode and query
  useEffect(() => {
    let active = true;
    const fetchResults = async () => {
      if (!adMeta.ldapEnabled) return;
      if (adMode === 'filter') {
        const q = debouncedQuery.toLowerCase();
        const depts = (adMeta.departments || []).filter(d => d.toLowerCase().includes(q)).map(d => ({ id: `dept_${d}`, name: d, type: 'Department', rawValue: d }));
        const ous = (adMeta.ous || []).filter(o => o.toLowerCase().includes(q)).map(o => ({ id: `ou_${o}`, name: o, type: 'OU', rawValue: o }));
        const groups = (adMeta.groups || []).filter(g => g.toLowerCase().includes(q)).map(g => ({ id: `group_${g}`, name: g, type: 'Group', rawValue: g }));
        if (active) {
          setUnifiedResults([...depts, ...ous, ...groups]);
          setSearching(false);
        }
      } else {
        // search or all
        setSearching(true);
        try {
          const res = await searchDirectoryUsers({ query: debouncedQuery.trim() });
          if (active && res.success) {
            setUnifiedResults(res.data || []);
          }
        } catch (err) {
          console.warn('Search error:', err.message);
        } finally {
          if (active) setSearching(false);
        }
      }
    };
    fetchResults();
    return () => { active = false; };
  }, [debouncedQuery, adMode, adMeta]);

  // Update matched count for filter mode
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

  // Selection handlers
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

  const toggleEmail = (email) => {
    const norm = email.toLowerCase();
    if (selectedEmails.includes(norm)) {
      setSelectedEmails(selectedEmails.filter((e) => e !== norm));
    } else {
      setSelectedEmails([...selectedEmails, norm]);
    }
  };

  const selectAllSearchEmails = () => {
    const all = unifiedResults.map((u) => u.email?.toLowerCase()).filter(Boolean);
    setSelectedEmails(Array.from(new Set([...selectedEmails, ...all])));
  };

  const deselectAllSearchEmails = () => {
    const set = new Set(unifiedResults.map((u) => u.email?.toLowerCase()));
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

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const displayedResults = unifiedResults.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getPlaceholder = () => {
    if (adMode === 'filter') return "Search Departments, OUs, or Groups by name...";
    if (adMode === 'search') return "Search users by name, username, or email...";
    return "Search entire directory to preview users...";
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
            <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
              <RadioGroup
                row
                value={adMode}
                onChange={(e) => {
                  setAdMode(e.target.value);
                  setSearchQuery('');
                  setPage(0);
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: searching ? (
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
                  {unifiedResults.length} Results
                  {adMode === 'search' && ` (${selectedEmails.length} Selected)`}
                  {adMode === 'filter' && ` (${selectedDepartments.length + selectedOus.length + selectedGroups.length} Selected)`}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {adMode === 'search' && (
                    <>
                      <Button size="small" onClick={selectAllSearchEmails} sx={{ color: '#60a5fa', fontSize: '0.72rem' }}>
                        Select All
                      </Button>
                      <Button size="small" onClick={deselectAllSearchEmails} sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
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
                    {displayedResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={adMode === 'filter' ? 3 : 4} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                          No results found
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedResults.map((item, i) => {
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
                          const isSelected = adMode === 'all' ? false : selectedEmails.includes(item.email?.toLowerCase());
                          return (
                            <TableRow
                              key={i}
                              hover
                              onClick={() => { if (adMode !== 'all' && item.email) toggleEmail(item.email); }}
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
                count={unifiedResults.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[]} // Disable rows per page selector, hardcoded to 15
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
                  label={checkingCount ? 'Calculating...' : `${matchedCount ?? 0} Matched Targets`}
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
            (adMode === 'filter' && (selectedDepartments.length + selectedOus.length + selectedGroups.length) === 0)
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
