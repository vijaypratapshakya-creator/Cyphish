import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Grid,
    FormControlLabel,
    Checkbox,
    CircularProgress,
    Tabs,
    Tab,
    Box,
    Typography,
    Alert,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Rating,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CodeIcon from '@mui/icons-material/Code';
import PropTypes from 'prop-types';
import { createTemplate } from '../../services/templateService';

const CATEGORIES = ['IT & Security', 'Finance & Payroll', 'HR & Benefits', 'Executive / Spear', 'Urgent Notice'];

const ImportTemplateDialog = ({ open, onClose, onImportSuccess }) => {
    const [tabIndex, setTabIndex] = useState(0); // 0 = File Upload, 1 = Raw Code Paste
    const [templateName, setTemplateName] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [sameAsTemplate, setSameAsTemplate] = useState(true);
    const [category, setCategory] = useState('IT & Security');
    const [difficulty, setDifficulty] = useState(3);
    const [rawCode, setRawCode] = useState('');
    const [htmlFile, setHtmlFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setHtmlFile(file);
            setErrorMessage('');
            if (!templateName) {
                const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                setTemplateName(baseName);
                if (sameAsTemplate) {
                    setEmailSubject(baseName);
                }
            }
        }
    };

    const handleSubmit = async () => {
        const finalEmailSubject = sameAsTemplate ? templateName : emailSubject;
        if (!templateName.trim()) {
            setErrorMessage('Scenario / template name is required.');
            return;
        }
        if (!sameAsTemplate && !emailSubject.trim()) {
            setErrorMessage('Email subject line is required.');
            return;
        }

        if (tabIndex === 0 && !htmlFile) {
            setErrorMessage('Please select an HTML or EML file to upload.');
            return;
        }

        if (tabIndex === 1 && !rawCode.trim()) {
            setErrorMessage('Please paste the raw HTML or EML code.');
            return;
        }

        setLoading(true);
        setErrorMessage('');

        try {
            if (tabIndex === 0 && htmlFile) {
                const formData = new FormData();
                formData.append('name', templateName.trim());
                formData.append('subject', finalEmailSubject.trim());
                formData.append('category', category);
                formData.append('difficulty', difficulty);
                formData.append('type', category);
                formData.append('file', htmlFile);

                const res = await createTemplate(formData);
                if (res.success) {
                    handleClose();
                    if (typeof onImportSuccess === 'function') onImportSuccess();
                } else {
                    setErrorMessage(res.message || 'Failed to import template.');
                }
            } else {
                const payload = {
                    name: templateName.trim(),
                    subject: finalEmailSubject.trim(),
                    category,
                    difficulty,
                    type: category,
                    htmlContent: rawCode,
                    sourceFormat: 'html',
                };

                const res = await createTemplate(payload);
                if (res.success) {
                    handleClose();
                    if (typeof onImportSuccess === 'function') onImportSuccess();
                } else {
                    setErrorMessage(res.message || 'Failed to import template.');
                }
            }
        } catch (err) {
            setErrorMessage(err.response?.data?.message || err.message || 'An error occurred during import.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        onClose();
        setTemplateName('');
        setEmailSubject('');
        setHtmlFile(null);
        setRawCode('');
        setErrorMessage('');
        setSameAsTemplate(true);
        setTabIndex(0);
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#111827',
                    color: '#f8fafc',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                }
            }}
        >
            <DialogTitle sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', pb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                    Import HTML / EML Threat Scenario
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                    Import existing phishing simulation emails from raw files or direct HTML source code.
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ mt: 2 }}>
                {errorMessage && (
                    <Alert severity="error" sx={{ mb: 2.5, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        {errorMessage}
                    </Alert>
                )}

                <Tabs
                    value={tabIndex}
                    onChange={(e, nv) => { setTabIndex(nv); setErrorMessage(''); }}
                    sx={{
                        mb: 3,
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        '& .MuiTab-root': {
                            color: '#94a3b8',
                            fontWeight: 600,
                            textTransform: 'none',
                            '&.Mui-selected': { color: '#60a5fa' }
                        },
                        '& .MuiTabs-indicator': { bgcolor: '#3b82f6' }
                    }}
                >
                    <Tab icon={<UploadFileIcon />} iconPosition="start" label="Upload File (.html / .eml)" />
                    <Tab icon={<CodeIcon />} iconPosition="start" label="Paste Raw Code" />
                </Tabs>

                <Grid container spacing={2.5}>
                    {/* Template Name */}
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Scenario / Template Title"
                            placeholder="e.g. IT Security Password Expiry"
                            value={templateName}
                            onChange={(e) => {
                                setTemplateName(e.target.value);
                                if (sameAsTemplate) setEmailSubject(e.target.value);
                                if (e.target.value) setErrorMessage('');
                            }}
                            required
                            InputLabelProps={{ sx: { color: '#94a3b8' } }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    color: '#f8fafc',
                                    bgcolor: '#1e293b',
                                    borderRadius: '10px',
                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                    '&:hover fieldset': { borderColor: '#3b82f6' },
                                }
                            }}
                        />
                    </Grid>

                    {/* Category */}
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel sx={{ color: '#94a3b8' }}>Category</InputLabel>
                            <Select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                label="Category"
                                sx={{
                                    color: '#f8fafc',
                                    bgcolor: '#1e293b',
                                    borderRadius: '10px',
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' },
                                }}
                            >
                                {CATEGORIES.map((c) => (
                                    <MenuItem key={c} value={c}>{c}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Email Subject Line */}
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Email Subject Line"
                            placeholder="e.g. Urgent: Action required on your Microsoft account"
                            value={sameAsTemplate ? templateName : emailSubject}
                            disabled={sameAsTemplate}
                            onChange={(e) => {
                                setEmailSubject(e.target.value);
                                if (e.target.value) setErrorMessage('');
                            }}
                            required
                            InputLabelProps={{ sx: { color: '#94a3b8' } }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    color: '#f8fafc',
                                    bgcolor: sameAsTemplate ? '#0f172a' : '#1e293b',
                                    borderRadius: '10px',
                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                    '&:hover fieldset': { borderColor: '#3b82f6' },
                                }
                            }}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={sameAsTemplate}
                                    onChange={(e) => {
                                        setSameAsTemplate(e.target.checked);
                                        if (e.target.checked) setEmailSubject(templateName);
                                    }}
                                    sx={{ color: '#3b82f6' }}
                                />
                            }
                            label={<Typography variant="body2" sx={{ color: '#94a3b8' }}>Use Template Name as Email Subject</Typography>}
                            sx={{ mt: 0.5 }}
                        />
                    </Grid>

                    {/* Difficulty Level */}
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#1e293b', p: 1.5, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                                Difficulty Rating:
                            </Typography>
                            <Rating
                                value={difficulty}
                                onChange={(e, nv) => setDifficulty(nv || 3)}
                                max={5}
                                sx={{ color: '#f59e0b' }}
                            />
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                                (Level {difficulty} of 5)
                            </Typography>
                        </Box>
                    </Grid>

                    {/* Tab 0: File Upload */}
                    {tabIndex === 0 && (
                        <Grid item xs={12}>
                            <Box
                                component="label"
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px dashed rgba(59, 130, 246, 0.4)',
                                    borderRadius: '12px',
                                    p: 3.5,
                                    cursor: 'pointer',
                                    bgcolor: 'rgba(59, 130, 246, 0.04)',
                                    '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.08)', borderColor: '#3b82f6' },
                                    transition: 'all 0.2s',
                                }}
                            >
                                <input
                                    type="file"
                                    hidden
                                    accept=".html,.htm,.eml"
                                    onChange={handleFileChange}
                                />
                                <UploadFileIcon sx={{ fontSize: 40, color: '#60a5fa', mb: 1 }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#f8fafc' }}>
                                    {htmlFile ? htmlFile.name : 'Click or drag HTML / EML file here'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5 }}>
                                    Supports .html, .htm, and .eml email formats (Max 5MB)
                                </Typography>
                            </Box>
                        </Grid>
                    )}

                    {/* Tab 1: Paste Code */}
                    {tabIndex === 1 && (
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={10}
                                label="Raw HTML / EML Content"
                                placeholder="<!DOCTYPE html><html><body><h1>Notice</h1><p>Click {{link}}</p></body></html>"
                                value={rawCode}
                                onChange={(e) => {
                                    setRawCode(e.target.value);
                                    if (e.target.value) setErrorMessage('');
                                }}
                                InputLabelProps={{ sx: { color: '#94a3b8' } }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        color: '#38bdf8',
                                        fontFamily: 'monospace',
                                        fontSize: '0.85rem',
                                        bgcolor: '#0f172a',
                                        borderRadius: '10px',
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                        '&:hover fieldset': { borderColor: '#3b82f6' },
                                    }
                                }}
                            />
                        </Grid>
                    )}
                </Grid>
            </DialogContent>

            <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', p: 2.5 }}>
                <Button onClick={handleClose} sx={{ color: '#94a3b8', textTransform: 'none', fontWeight: 600 }}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading || !templateName.trim() || (tabIndex === 0 && !htmlFile) || (tabIndex === 1 && !rawCode.trim())}
                    sx={{
                        bgcolor: '#3b82f6',
                        color: '#fff',
                        px: 3,
                        py: 1,
                        borderRadius: '8px',
                        fontWeight: 700,
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#2563eb' },
                    }}
                >
                    {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Save to Scenario Library'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

ImportTemplateDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onImportSuccess: PropTypes.func,
};

export default ImportTemplateDialog;
