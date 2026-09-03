import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useMediaQuery,
  Divider,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Group as GroupIcon,
  Outbox as OutboxIcon,
  Email as EmailIcon,
  Campaign as CampaignIcon,
  Menu as MenuIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useTheme } from '@mui/material/styles';
import { NavLink, useNavigate } from 'react-router-dom';
import { getVersionInfo } from '../services/versionService';
import { getMe } from '../services/userService';
import { jwtDecode } from 'jwt-decode';
import { getToken, logout } from '../utils/tokenManager';
import cyphishLogo from '../assets/img/cyphish-logo.png';

const Sidebar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const [open, setOpen] = useState(!isMobile);
  const [version, setVersion] = useState('1.0.0');
  const [releaseDate, setReleaseDate] = useState(null);
  const [user, setUser] = useState(null);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);

  const handleToggle = () => {
    setOpen(!open);
  };

  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        const versionInfo = await getVersionInfo();
        setVersion(versionInfo.version);
        setReleaseDate(versionInfo.releaseDate);
      } catch (error) {
        console.error('Failed to fetch version info:', error);
      }
    };
    fetchVersionInfo();

    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch (e) {
        setUser(null);
      }
    }
  }, []);

  const handleProfileMenuOpen = async (event) => {
    setProfileMenuAnchor(event.currentTarget);
    try {
      const res = await getMe();
      if (res?.success && res?.data) setUser(res.data);
    } catch (e) {}
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
  };

  const menuItems = [
    {
      group: 'Analytics & Reports',
      items: [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/console/dashboard' },
        { text: 'Reports & Risk', icon: <AssessmentIcon />, path: '/console/reports' },
      ],
    },
    {
      group: 'Simulation Operations',
      items: [
        { text: 'Audience Lists', icon: <GroupIcon />, path: '/console/audience' },
        { text: 'SMTP Profiles', icon: <OutboxIcon />, path: '/console/sender-profile' },
        { text: 'Email Templates', icon: <EmailIcon />, path: '/console/templates' },
        { text: 'Campaigns', icon: <CampaignIcon />, path: '/console/campaign' },
      ],
    },
    {
      group: 'Administration',
      items: [
        { text: 'System Settings', icon: <SettingsIcon />, path: '/console/settings' },
      ],
    },
  ];

  const accountNavItem = { text: 'Account Profile', icon: <AccountCircleIcon />, path: '/console/account/profile' };

  const listItemSx = {
    mx: 1.5,
    mb: 0.5,
    borderRadius: '10px',
    backgroundColor: 'transparent',
    color: '#475569',
    '&:hover': {
      backgroundColor: 'rgba(29, 78, 216, 0.06)',
      color: '#1d4ed8',
      transform: 'translateX(3px)',
    },
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    '& .MuiListItemIcon-root': {
      color: '#64748b',
      transition: 'color 0.2s ease',
    },
    '& .MuiListItemText-primary': {
      fontWeight: 500,
      fontSize: '0.88rem',
    },
    '&.active': {
      backgroundColor: '#1d4ed8',
      color: '#ffffff',
      '&:hover': {
        backgroundColor: '#1e40af',
      },
      '& .MuiListItemIcon-root': {
        color: '#ffffff',
      },
      '& .MuiListItemText-primary': {
        fontWeight: 600,
        color: '#ffffff',
      },
    },
  };

  return (
    <>
      {/* Modern Sleek AppBar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: '#0f172a',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <Toolbar variant="dense" sx={{ display: 'flex', justifyContent: 'space-between', minHeight: '52px !important', px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                onClick={handleToggle}
                edge="start"
                sx={{ mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography 
              variant="h6" 
              noWrap 
              component="div" 
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
            >
              <Box component="img" src={cyphishLogo} alt="CyPhish" sx={{ height: 32, width: 'auto', display: 'block' }} />
            </Typography>
            <Chip
              size="small"
              label="Enterprise Security"
              sx={{
                bgcolor: 'rgba(37, 99, 235, 0.15)',
                color: '#60a5fa',
                fontWeight: 600,
                fontSize: '0.72rem',
                height: 22,
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            />
          </Box>

          {/* User Profile Avatar & Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#f8fafc', lineHeight: 1.2 }}>
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.username || 'Administrator'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                {user?.role === 'admin' ? 'Security Admin' : user?.role || 'User'}
              </Typography>
            </Box>

            <IconButton
              size="small"
              onClick={handleProfileMenuOpen}
              sx={{ p: 0.5, border: '2px solid rgba(255,255,255,0.1)' }}
            >
              <Avatar sx={{ bgcolor: '#2563eb', color: '#fff', width: 34, height: 34, fontWeight: 700, fontSize: '0.9rem' }}>
                {user?.firstName ? user.firstName[0].toUpperCase() : (user?.username ? user.username[0].toUpperCase() : 'A')}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={profileMenuAnchor}
              open={Boolean(profileMenuAnchor)}
              onClose={handleProfileMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                sx: {
                  borderRadius: '16px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                  minWidth: 250,
                  p: 1,
                  mt: 1,
                }
              }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} noWrap>
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.username || 'Administrator'}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.8rem' }}>
                  {user?.email || 'admin@cyphish'}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/console/account/profile'); }}>
                Account Profile
              </MenuItem>
              <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/console/settings'); }}>
                System Settings
              </MenuItem>
              <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/console/account/security'); }}>
                Change Password
              </MenuItem>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ px: 2, py: 0.5 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Version: {version} {releaseDate ? `(${releaseDate})` : ''}
                </Typography>
              </Box>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem onClick={handleLogout} sx={{ color: '#dc2626', fontWeight: 600 }}>
                Sign Out
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        sx={{
          width: 250,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 250,
            boxSizing: 'border-box',
            borderRight: '1px solid #e2e8f0',
            bgcolor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        open={open}
        onClose={handleToggle}
        ModalProps={{ keepMounted: true }}
      >
        <Toolbar variant="dense" sx={{ minHeight: '52px !important' }} />
        
        <List sx={{ pt: 2, flex: 1, overflowY: 'auto' }}>
          {menuItems.map((group) => (
            <Box key={group.group} sx={{ mb: 1.5 }}>
              <Typography
                variant="caption"
                sx={{
                  px: 3,
                  py: 0.5,
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  color: '#94a3b8',
                  display: 'block',
                }}
              >
                {group.group}
              </Typography>
              {group.items.map((item) => (
                <ListItem
                  key={item.text}
                  component={NavLink}
                  to={item.path}
                  onClick={isMobile ? handleToggle : undefined}
                  sx={listItemSx}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItem>
              ))}
            </Box>
          ))}
        </List>

        <Box sx={{ borderTop: '1px solid #e2e8f0', p: 1, bgcolor: '#f8fafc' }}>
          <ListItem
            component={NavLink}
            to={accountNavItem.path}
            onClick={isMobile ? handleToggle : undefined}
            sx={listItemSx}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>{accountNavItem.icon}</ListItemIcon>
            <ListItemText primary={accountNavItem.text} />
          </ListItem>
        </Box>
      </Drawer>
    </>
  );
};

export default Sidebar;
