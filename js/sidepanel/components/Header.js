import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar
} from '@mui/material';
import {
  Settings as SettingsIcon
} from '@mui/icons-material';

const Header = ({ school, onSettingsClick }) => {
  const getSchoolLogo = (schoolCode) => {
    return `images/icon.png`//`images/${schoolCode || 'oca'}logo.png`;
  };

  return (
    <AppBar
      position="static"
      elevation={1}
      sx={{
        background: 'linear-gradient(118deg, #3d1235 0%, #722362 58%, #521948 100%)',
        borderRadius: '0 0 6px 6px',
        boxShadow: '0 8px 24px rgba(114, 35, 98, 0.25)',
        mb: 1,
        overflow: 'hidden',
        '&::after': { content: '""', position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,.19), transparent 38%)', pointerEvents: 'none' }
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: '48px !important', px: 1.5 }}>
        <Avatar
          src={getSchoolLogo(school)}
          alt={`${school?.toUpperCase() || 'School'} Logo`}
          sx={{ width: 28, height: 28, mr: 1, border: '1px solid rgba(255,255,255,.35)' }}
        />

        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" component="h1" fontWeight={750} sx={{ lineHeight: 1.2, letterSpacing: '-0.02em', fontSize: '0.92rem' }}>
            CHAT - Connexus Homeroom Attendance Tool
          </Typography>
        </Box>

        <IconButton
          onClick={onSettingsClick}
          sx={{
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <SettingsIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
