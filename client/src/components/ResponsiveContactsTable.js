import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    IconButton,
    useTheme,
    useMediaQuery,
    Card,
    CardContent,
    Stack,
    Tooltip,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    List,
    ListItem,
    Divider,
    TextField,
    InputAdornment,
    Pagination,
    FormControl,
    Select,
    MenuItem,
    Grid
} from '@mui/material';
import { 
    Visibility as VisibilityIcon, 
    HighlightOff as HighlightOffIcon,
    Email as EmailIcon,
    Person as PersonIcon,
    Business as BusinessIcon,
    LocationOn as LocationIcon,
    Search as SearchIcon
} from '@mui/icons-material';

const ResponsiveContactsTable = ({ 
    contacts, 
    loading, 
    onViewContact, 
    onDeleteContact 
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));
    const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
    
    // Add window width state for continuous resizing
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    // Pagination and search state
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Listen for window resize
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Filter contacts based on search term
    const filteredContacts = contacts.filter(contact => {
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim().toLowerCase();
        const email = (contact.email || '').toLowerCase();
        const role = (contact.role || '').toLowerCase();
        const country = (contact.country || '').toLowerCase();

        return fullName.includes(searchLower) || 
               email.includes(searchLower) || 
               role.includes(searchLower) || 
               country.includes(searchLower);
    });

    // Calculate pagination
    const totalPages = Math.ceil(filteredContacts.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedContacts = filteredContacts.slice(startIndex, startIndex + rowsPerPage);

    // Reset to first page when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Helper functions for table rendering
    const getColumnWidth = (column) => {
        // Desktop column widths
        const widths = {
            name: '25%',
            email: '30%',
            role: '20%',
            country: '15%',
            actions: '10%'
        };
        return widths[column];
    };

    const getColumnHeader = (column) => {
        const headers = {
            name: 'Name',
            email: 'Email Address',
            role: 'Role',
            country: 'Country',
            actions: 'Actions'
        };
        return headers[column];
    };

    const renderCell = (contact, column) => {
        switch (column) {
            case 'name':
                const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
                return (
                    <Typography sx={{ 
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {fullName || 'Unnamed Contact'}
                    </Typography>
                );
            case 'email':
                return (
                    <Typography sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {contact.email}
                    </Typography>
                );
            case 'role':
                return (
                    <Typography sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {contact.role || 'N/A'}
                    </Typography>
                );
            case 'country':
                return (
                    <Typography sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {contact.country || 'N/A'}
                    </Typography>
                );
            case 'actions':
                return (
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="View Details">
                            <IconButton 
                                color="primary" 
                                size="small"
                                onClick={() => onViewContact(contact)}
                            >
                                <VisibilityIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Contact">
                            <IconButton 
                                color="error" 
                                size="small"
                                onClick={() => onDeleteContact(contact._id)}
                            >
                                <HighlightOffIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                );
            default:
                return null;
        }
    };

    // Mobile compact card view
    const renderMobileCards = () => (
        <Box sx={{ mt: 2 }}>
            {paginatedContacts.map((contact, index) => {
                const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
                return (
                    <Card 
                        key={contact._id} 
                        sx={{ 
                            borderRadius: 0,
                            backgroundColor: '#111827',
                            boxShadow: 'none',
                            borderBottom: index < paginatedContacts.length - 1 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                            '&:hover': {
                                backgroundColor: 'rgba(59, 130, 246, 0.04)',
                                transition: 'all 0.2s ease-in-out'
                            }
                        }}
                    >
                        <CardContent sx={{ p: 2, pb: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    {/* Name */}
                                    <Typography sx={{ 
                                        fontWeight: 600,
                                        fontSize: '1rem',
                                        color: '#f8fafc',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        mb: 0.5
                                    }}>
                                        {fullName || 'Unnamed Contact'}
                                    </Typography>
                                    
                                    {/* Email */}
                                    <Typography sx={{ 
                                        fontSize: '0.875rem',
                                        color: '#94a3b8',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {contact.email}
                                    </Typography>
                                </Box>
                                
                                {/* Actions */}
                                <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                                    <Tooltip title="View Details">
                                        <IconButton 
                                            color="primary" 
                                            size="small"
                                            onClick={() => onViewContact(contact)}
                                        >
                                            <VisibilityIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete Contact">
                                        <IconButton 
                                            color="error" 
                                            size="small"
                                            onClick={() => onDeleteContact(contact._id)}
                                        >
                                            <HighlightOffIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                );
            })}
        </Box>
    );

    // Search and pagination controls
    const renderControls = () => (
        <Box sx={{ mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12}>
                    <TextField
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        size="small"
                        fullWidth
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                backgroundColor: 'rgba(11, 15, 25, 0.5)',
                                color: '#f8fafc',
                                '&:hover': {
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'primary.main',
                                    },
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'rgba(255, 255, 255, 0.12)',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                },
                            },
                        }}
                    />
                </Grid>
            </Grid>
        </Box>
    );

    // Pagination component with enhanced layout
    const renderPagination = () => (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'stretch', sm: 'center' }, 
            mt: 3,
            px: 1,
            gap: { xs: 3, sm: 0 }
        }}>
            <FormControl size="small" sx={{ 
                minWidth: 80, 
                alignSelf: { xs: 'center', sm: 'flex-start' },
                mb: { xs: 2, sm: 0 }
            }}>
                <Select
                    value={rowsPerPage}
                    onChange={(e) => {
                        setRowsPerPage(e.target.value);
                        setCurrentPage(1);
                    }}
                    sx={{ 
                        borderRadius: 2,
                        backgroundColor: 'rgba(11, 15, 25, 0.5)',
                        color: '#f8fafc',
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.12)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                        },
                        '& .MuiSvgIcon-root': {
                            color: '#94a3b8'
                        }
                    }}
                >
                    <MenuItem value={5}>5 per page</MenuItem>
                    <MenuItem value={10}>10 per page</MenuItem>
                    <MenuItem value={25}>25 per page</MenuItem>
                    <MenuItem value={50}>50 per page</MenuItem>
                </Select>
            </FormControl>
            
            <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'center', sm: 'center' }, 
                gap: { xs: 2, sm: 2 }
            }}>
                <Typography variant="body2" color="text.secondary" sx={{ 
                    textAlign: { xs: 'center', sm: 'left' },
                    mb: { xs: 1, sm: 0 }
                }}>
                    Page {currentPage} of {totalPages}
                </Typography>
                <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={(e, page) => setCurrentPage(page)}
                    size="small"
                    color="primary"
                    showFirstButton
                    showLastButton
                    sx={{
                        '& .MuiPaginationItem-root': {
                            borderRadius: 1,
                        },
                    }}
                />
            </Box>
        </Box>
    );

    if (loading) {
        return (
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '300px',
                flexDirection: 'column',
                gap: 2
            }}>
                <CircularProgress />
                <Typography>Loading Contacts...</Typography>
            </Box>
        );
    }

    if (contacts.length === 0) {
        return (
            <Box sx={{ 
                textAlign: 'center', 
                py: 4,
                backgroundColor: '#111827',
                borderRadius: 2,
                border: '1px dashed rgba(255, 255, 255, 0.15)'
            }}>
                <Typography variant="h6" sx={{ color: '#f8fafc', mb: 1 }}>
                    No contacts found
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    This audience doesn't have any contacts yet. Add some contacts to get started.
                </Typography>
            </Box>
        );
    }

    // Use compact card view for mobile and tablet devices (up to 1024px)
    if (windowWidth < 1024) {
        return (
            <Box>
                {renderControls()}
                {renderMobileCards()}
                {totalPages > 1 && renderPagination()}
            </Box>
        );
    }

    // Desktop table configuration
    const visibleColumns = ['name', 'email', 'role', 'country', 'actions'];

    // Use custom table for desktop only (1024px and above)
    return (
        <Box>
            {renderControls()}
            <Box sx={{ 
                width: '100%',
                overflow: 'auto',
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                backgroundColor: '#111827',
                border: '1px solid rgba(255,255,255,0.08)'
            }}>
                <TableContainer>
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#0f172a' }}>
                                {visibleColumns.map((column) => (
                                    <TableCell
                                        key={column}
                                        sx={{
                                            width: getColumnWidth(column),
                                            fontWeight: 600,
                                            color: '#94a3b8',
                                            borderBottom: '2px solid rgba(255, 255, 255, 0.08)',
                                            padding: '16px',
                                            fontSize: '0.8rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}
                                    >
                                        {getColumnHeader(column)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedContacts.map((contact) => (
                                <TableRow
                                    key={contact._id}
                                    sx={{
                                        '&:hover': {
                                            backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                            transition: 'background-color 0.2s ease-in-out'
                                        },
                                        '&:last-child td': {
                                            border: 0
                                        }
                                    }}
                                >
                                    {visibleColumns.map((column) => (
                                        <TableCell
                                            key={column}
                                            sx={{
                                                width: getColumnWidth(column),
                                                padding: '12px 16px',
                                                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            {renderCell(contact, column)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
            {totalPages > 1 && renderPagination()}
        </Box>
    );
};

export default ResponsiveContactsTable; 