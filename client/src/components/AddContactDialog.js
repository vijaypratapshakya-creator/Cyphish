import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    TextField,
    Grid,
    Autocomplete,
    Box,
    Typography,
    CircularProgress,
    Chip,
    Paper,
} from '@mui/material';
import { Add, Business, Search as SearchIcon, CheckCircle } from '@mui/icons-material';
import { COUNTRIES } from '../utils/constants';
import { 
    dialogPaperProps, 
    gradientHeaderStyles,
    fieldLabelStyles
} from '../utils/styles';
import { queryDirectoryTargets } from '../services/systemService';

const AddContactDialog = ({ 
    open, 
    onClose, 
    newContact, 
    onContactChange, 
    onAddContact, 
    formErrors 
}) => {
    const [adSearchQuery, setAdSearchQuery] = useState('');
    const [adOptions, setAdOptions] = useState([]);
    const [adLoading, setAdLoading] = useState(false);
    const [selectedADUser, setSelectedADUser] = useState(null);

    // Reset AD search state when dialog closes or opens
    useEffect(() => {
        if (!open) {
            setAdSearchQuery('');
            setAdOptions([]);
            setSelectedADUser(null);
        }
    }, [open]);

    // Live search Active Directory users
    useEffect(() => {
        let active = true;

        if (!adSearchQuery || adSearchQuery.trim().length < 2) {
            setAdOptions([]);
            return undefined;
        }

        const timeoutId = setTimeout(async () => {
            setAdLoading(true);
            try {
                const res = await queryDirectoryTargets({ query: adSearchQuery.trim() });
                if (active && res.success && res.data?.contacts) {
                    setAdOptions(res.data.contacts);
                }
            } catch (err) {
                console.error('Failed to search directory targets:', err);
                if (active) setAdOptions([]);
            } finally {
                if (active) setAdLoading(false);
            }
        }, 300);

        return () => {
            active = false;
            clearTimeout(timeoutId);
        };
    }, [adSearchQuery]);

    const handleSelectADUser = (event, user) => {
        setSelectedADUser(user);
        if (user) {
            onContactChange({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                phoneNumber: user.phoneNumber || user.telephoneNumber || '',
                role: user.role || user.jobTitle || user.department || '',
                country: user.country || ''
            });
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            PaperProps={dialogPaperProps}
        >
            <DialogTitle sx={gradientHeaderStyles}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Add sx={{ fontSize: 28 }} />
                    <Typography variant="h6">Add New Contact</Typography>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 3, pt: 2 }}>
                <DialogContentText sx={{ pt: 1, mb: 2, color: 'text.secondary' }}>
                    Fill in contact details manually or search Active Directory to auto-populate fields.
                </DialogContentText>

                {/* Active Directory Quick Autofill Section */}
                <Paper 
                    variant="outlined" 
                    sx={{ 
                        p: 2, 
                        mb: 3, 
                        backgroundColor: '#f8fafc', 
                        borderColor: '#e2e8f0', 
                        borderRadius: '12px' 
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Business sx={{ color: '#2563eb', fontSize: 20 }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                Active Directory Quick Autofill
                            </Typography>
                        </Box>
                        <Chip 
                            label="Optional" 
                            size="small" 
                            sx={{ fontSize: '0.7rem', height: 20, backgroundColor: '#e2e8f0', color: '#475569' }} 
                        />
                    </Box>

                    <Autocomplete
                        options={adOptions}
                        getOptionLabel={(option) => `${option.firstName || ''} ${option.lastName || ''} (${option.email})`.trim()}
                        filterOptions={(x) => x}
                        value={selectedADUser}
                        onChange={handleSelectADUser}
                        onInputChange={(event, newInputValue) => {
                            setAdSearchQuery(newInputValue);
                        }}
                        loading={adLoading}
                        noOptionsText={adSearchQuery.length < 2 ? "Type at least 2 characters to search AD" : "No directory users found"}
                        renderOption={(props, option) => (
                            <Box component="li" {...props} key={option.email} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                        {option.firstName} {option.lastName}
                                    </Typography>
                                    {option.department && (
                                        <Chip label={option.department} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                                    )}
                                </Box>
                                <Typography variant="caption" sx={{ color: '#64748b' }}>
                                    {option.email} {option.role || option.jobTitle ? `• ${option.role || option.jobTitle}` : ''}
                                </Typography>
                            </Box>
                        )}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                size="small"
                                placeholder="Search by name, email, department or sAMAccountName..."
                                InputProps={{
                                    ...params.InputProps,
                                    startAdornment: (
                                        <>
                                            <SearchIcon sx={{ color: '#64748b', mr: 1, fontSize: 20 }} />
                                            {params.InputProps.startAdornment}
                                        </>
                                    ),
                                    endAdornment: (
                                        <>
                                            {adLoading ? <CircularProgress color="inherit" size={18} /> : null}
                                            {params.InputProps.endAdornment}
                                        </>
                                    ),
                                }}
                            />
                        )}
                    />
                    {selectedADUser && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, color: '#16a34a' }}>
                            <CheckCircle sx={{ fontSize: 16 }} />
                            <Typography variant="caption" sx={{ fontWeight: 500 }}>
                                Populated details for {selectedADUser.firstName} {selectedADUser.lastName} ({selectedADUser.email})
                            </Typography>
                        </Box>
                    )}
                </Paper>
                
                <form>
                    <Grid container spacing={3}>
                        {/* First Name */}
                        <Grid item xs={12} md={6}>
                            <Box>
                                <Typography variant="caption" sx={fieldLabelStyles}>
                                    FIRST NAME *
                                </Typography>
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    name="firstName"
                                    placeholder="Enter first name"
                                    type="text"
                                    fullWidth
                                    variant="outlined"
                                    value={newContact.firstName}
                                    onChange={onContactChange}
                                    required
                                    error={!!formErrors.firstName}
                                    helperText={formErrors.firstName || ''}
                                    sx={{ mt: 1 }}
                                />
                            </Box>
                        </Grid>

                        {/* Last Name */}
                        <Grid item xs={12} md={6}>
                            <Box>
                                <Typography variant="caption" sx={fieldLabelStyles}>
                                    LAST NAME
                                </Typography>
                                <TextField
                                    margin="dense"
                                    name="lastName"
                                    placeholder="Enter last name"
                                    type="text"
                                    fullWidth
                                    variant="outlined"
                                    value={newContact.lastName}
                                    onChange={onContactChange}
                                    sx={{ mt: 1 }}
                                />
                            </Box>
                        </Grid>

                        {/* Email */}
                        <Grid item xs={12} md={6}>
                            <Box>
                                <Typography variant="caption" sx={fieldLabelStyles}>
                                    EMAIL ADDRESS *
                                </Typography>
                                <TextField
                                    margin="dense"
                                    name="email"
                                    placeholder="Enter email address"
                                    type="email"
                                    fullWidth
                                    variant="outlined"
                                    value={newContact.email}
                                    onChange={onContactChange}
                                    required
                                    error={!!formErrors.email}
                                    helperText={formErrors.email || ''}
                                    sx={{ mt: 1 }}
                                />
                            </Box>
                        </Grid>

                        {/* Phone Number */}
                        <Grid item xs={12} md={6}>
                            <Box>
                                <Typography variant="caption" sx={fieldLabelStyles}>
                                    PHONE NUMBER
                                </Typography>
                                <TextField
                                    margin="dense"
                                    name="phoneNumber"
                                    placeholder="Enter phone number"
                                    type="text"
                                    fullWidth
                                    variant="outlined"
                                    value={newContact.phoneNumber}
                                    onChange={onContactChange}
                                    sx={{ mt: 1 }}
                                />
                            </Box>
                        </Grid>

                        {/* Role */}
                        <Grid item xs={12} md={6}>
                            <Box>
                                <Typography variant="caption" sx={fieldLabelStyles}>
                                    ROLE
                                </Typography>
                                <TextField
                                    margin="dense"
                                    name="role"
                                    placeholder="Enter job role"
                                    type="text"
                                    fullWidth
                                    variant="outlined"
                                    value={newContact.role}
                                    onChange={onContactChange}
                                    sx={{ mt: 1 }}
                                />
                            </Box>
                        </Grid>

                        {/* Country - Autocomplete */}
                        <Grid item xs={12} md={6}>
                            <Box>
                                <Typography variant="caption" sx={fieldLabelStyles}>
                                    COUNTRY
                                </Typography>
                                <Autocomplete
                                    options={COUNTRIES}
                                    value={newContact.country}
                                    onChange={(event, newValue) => {
                                        onContactChange({
                                            target: { name: 'country', value: newValue || '' }
                                        });
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            margin="dense"
                                            placeholder="Select or type country"
                                            variant="outlined"
                                            error={!!formErrors.country}
                                            helperText={formErrors.country || ''}
                                            sx={{ mt: 1 }}
                                        />
                                    )}
                                    freeSolo
                                    autoHighlight
                                    filterOptions={(options, { inputValue }) => {
                                        const filtered = options.filter((option) =>
                                            option.toLowerCase().includes(inputValue.toLowerCase())
                                        );
                                        return filtered;
                                    }}
                                    sx={{
                                        '& .MuiAutocomplete-input': {
                                            padding: '16.5px 14px',
                                        },
                                    }}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </form>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0 }}>
                <Button 
                    onClick={onClose} 
                    variant="outlined"
                    sx={{ 
                        borderRadius: 2,
                        px: 3,
                        py: 1
                    }}
                >
                    Cancel
                </Button>
                <Button 
                    onClick={onAddContact} 
                    variant="contained"
                    sx={{ 
                        borderRadius: 2,
                        px: 3,
                        py: 1
                    }}
                >
                    Add Contact
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddContactDialog; 