import re
import os

filepath = r'e:\cyphish\CyPhish\client\src\pages\Audience\CreateAudience.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add TablePagination to imports
if 'TablePagination' not in content:
    content = content.replace('TableRow,', 'TableRow,\n  TablePagination,')

# Add missing icons
if 'Person as PersonIcon' not in content:
    content = content.replace('Settings as SettingsIcon,', 'Settings as SettingsIcon,\n  Person as PersonIcon,')

# Find the place to insert the new states
states_insertion_point = content.find('const handleSyncAdNow = async () => {')
new_states = """
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

"""
content = content[:states_insertion_point] + new_states + content[states_insertion_point:]

# Remove handleSearchAdUsers since we do it automatically now
content = re.sub(r'const handleSearchAdUsers = async \(\) => \{[\s\S]*?\};\n\n', '', content)
# We also need to change handleSelectAllSearchResults to use unifiedAdResults
content = content.replace('const allEmails = adSearchResults.map', 'const allEmails = unifiedAdResults.map')
content = content.replace('const resultEmailSet = new Set(adSearchResults.map', 'const resultEmailSet = new Set(unifiedAdResults.map')


# Now, find the UI portion to replace.
ui_start = content.find('{/* AD Import Sub-Mode Selector */}')
ui_end = content.find('</Box>\n                    )}', ui_start)

new_ui = """{/* AD Import Sub-Mode Selector */}
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
"""

content = content[:ui_start] + new_ui + content[ui_end:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated successfully!")
