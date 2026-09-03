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

  const userRole = user?.role || 'admin';

  const menuItems = [
    {
      group: 'Analytics & Command',
      items: [
        { text: 'SOC Dashboard', icon: <DashboardIcon />, path: '/console/dashboard' },
        { text: 'Reports & Risk', icon: <AssessmentIcon />, path: '/console/reports' },
      ],
    },
    {
      group: 'Simulation Operations',
      items: [
        { text: 'Audience Lists', icon: <GroupIcon />, path: '/console/audience' },
        { text: 'SMTP Profiles', icon: <OutboxIcon />, path: '/console/sender-profile' },
        { text: 'Email Templates', icon: <EmailIcon />, path: '/console/templates' },
        { text: 'Campaign Drills', icon: <CampaignIcon />, path: '/console/campaign' },
      ],
    },
    ...(userRole === 'admin' ? [
      {
        group: 'Administration & RBAC',
        items: [
          { text: 'System Settings', icon: <SettingsIcon />, path: '/console/settings' },
        ],
      }
    ] : []),
  ];

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <Chip size="small" label="👑 Main Admin" sx={{ bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 700, fontSize: '0.72rem', border: '1px solid rgba(59, 130, 246, 0.4)' }} />;
      case 'campaign_manager':
        return <Chip size="small" label="🛠️ Security Engineer" sx={{ bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 700, fontSize: '0.72rem', border: '1px solid rgba(16, 185, 129, 0.4)' }} />;
      default:
        return <Chip size="small" label="👁️ Auditor / Viewer" sx={{ bgcolor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 700, fontSize: '0.72rem', border: '1px solid rgba(245, 158, 11, 0.4)' }} />;
    }
  };

  const listItemSx = {
    mx: 1.5,
    mb: 0.6,
    borderRadius: '12px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid transparent',
    '&:hover': {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      color: '#f8fafc',
      borderColor: 'rgba(59, 130, 246, 0.2)',
      transform: 'translateX(4px)',
    },
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    '& .MuiListItemIcon-root': {
      color: '#64748b',
      minWidth: 38,
      transition: 'color 0.2s ease',
    },
    '& .MuiListItemText-primary': {
      fontWeight: 500,
      fontSize: '0.88rem',
    },
    '&.active': {
      backgroundColor: 'rgba(59, 130, 246, 0.18)',
      color: '#60a5fa',
      border: '1px solid rgba(59, 130, 246, 0.45)',
      boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)',
      '& .MuiListItemIcon-root': {
        color: '#60a5fa',
      },
      '& .MuiListItemText-primary': {
        fontWeight: 700,
        color: '#ffffff',
      },
    },
  };

  return (
    <>
      {/* Cyber Command Topbar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: '#070b14',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Toolbar variant="dense" sx={{ display: 'flex', justifyContent: 'space-between', minHeight: '56px !important', px: 2.5 }}>
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
            <Box 
              component="img" 
              src={cyphishLogo} 
              alt="CyPhish" 
              sx={{ 
                height: 32,
                cursor: 'pointer',
                filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.25))',
              }}
              onClick={() => navigate('/console/dashboard')}
            />
            <Chip 
              label="Cyber Command SOC" 
              size="small"
              sx={{
                bgcolor: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontWeight: 700,
                fontSize: '0.72rem',
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            />
          </Box>

          {/* User Profile Avatar & Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.username || 'Administrator'}
              </Typography>
              <Box sx={{ mt: 0.3 }}>
                {getRoleBadge(user?.role)}
              </Box>
            </Box>

            <IconButton
              size="small"
              onClick={handleProfileMenuOpen}
              sx={{ p: 0.5, border: '2px solid rgba(59, 130, 246, 0.3)' }}
            >
              <Avatar sx={{ bgcolor: '#2563eb', color: '#fff', width: 34, height: 34, fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 0 10px rgba(37, 99, 235, 0.4)' }}>
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
                  bgcolor: '#111827',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
                  minWidth: 260,
                  p: 1,
                  mt: 1,
                }
              }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#f8fafc' }} noWrap>
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.username || 'Administrator'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.8rem' }} noWrap>
                  {user?.email || 'admin@cyphish'}
                </Typography>
                <Box sx={{ mt: 0.8 }}>
                  {getRoleBadge(user?.role)}
                </Box>
              </Box>
              <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }} />
              <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/console/account/profile'); }} sx={{ color: '#cbd5e1', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}>
                Account Profile
              </MenuItem>
              {userRole === 'admin' && (
                <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/console/settings'); }} sx={{ color: '#cbd5e1', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}>
                  System Settings & RBAC
                </MenuItem>
              )}
              <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/console/account/security'); }} sx={{ color: '#cbd5e1', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}>
                Change Password
              </MenuItem>
              <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }} />
              <Box sx={{ px: 2, py: 0.5 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Version: {version} {releaseDate ? `(${releaseDate})` : ''}
                </Typography>
              </Box>
              <Divider sx={{ my: 0.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />
              <MenuItem onClick={handleLogout} sx={{ color: '#ef4444', fontWeight: 700, '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}>
                Sign Out
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Cyber Command Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={open}
        onClose={handleToggle}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            bgcolor: '#070b14',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            mt: '56px',
            height: 'calc(100% - 56px)',
          },
        }}
      >
        <Box sx={{ pt: 2 }}>
          {menuItems.map((group, groupIdx) => (
            <Box key={groupIdx} sx={{ mb: 2 }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  px: 3, 
                  py: 0.5, 
                  display: 'block',
                  color: '#64748b', 
                  fontWeight: 700, 
                  fontSize: '0.68rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                {group.group}
              </Typography>
              <List sx={{ p: 0 }}>
                {group.items.map((item, itemIdx) => (
                  <ListItem
                    key={itemIdx}
                    button
                    component={NavLink}
                    to={item.path}
                    sx={listItemSx}
                    onClick={() => isMobile && setOpen(false)}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItem>
                ))}
              </List>
            </Box>
          ))}
        </Box>

        {/* Footer Account Link */}
        <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <ListItem
            button
            component={NavLink}
            to="/console/account/profile"
            sx={listItemSx}
            onClick={() => isMobile && setOpen(false)}
          >
            <ListItemIcon><AccountCircleIcon /></ListItemIcon>
            <ListItemText primary="Account Profile" />
          </ListItem>
        </Box>
      </Drawer>
    </>
  );
};

export default Sidebar;
