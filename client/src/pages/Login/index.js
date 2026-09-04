import React from 'react';
import { useLocation } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useLogin } from '../../hooks/useLogin';
import Alert from '@mui/material/Alert';

const defaultTheme = createTheme();

export default function SignIn() {
    const { handleSubmit, loading, error } = useLogin();
    const location = useLocation();

    const searchParams = new URLSearchParams(location.search);
    const reason = searchParams.get('reason');
    const timeout = searchParams.get('timeout') || '15';

    return (
        <ThemeProvider theme={defaultTheme}>
            <Container component="main" maxWidth="xs">
                <CssBaseline />
                <Box
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}>
                    <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
                        <LockOutlinedIcon />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        Admin Panel
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1, mb: 2 }}>
                        Please enter your username and password to continue
                    </Typography>

                    {reason === 'inactivity' && (
                        <Alert severity="warning" sx={{ width: '100%', mb: 2 }}>
                            You were automatically logged out after {timeout} minutes of inactivity. Please sign in again.
                        </Alert>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ width: '100%', mt: 1, mb: 1 }}>
                            {error}
                        </Alert>
                    )}
                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2, width: '100%' }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Username"
                            name="username"
                            autoComplete="username"
                            autoFocus
                            sx={{
                                '& .MuiInputLabel-root': {
                                    '& .MuiInputLabel-asterisk': {
                                        color: 'error.main',
                                    },
                                },
                            }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            sx={{
                                '& .MuiInputLabel-root': {
                                    '& .MuiInputLabel-asterisk': {
                                        color: 'error.main',
                                    },
                                },
                            }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={loading}>
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </Button>
                    </Box>
                </Box>
            </Container>
        </ThemeProvider>
    );
}
