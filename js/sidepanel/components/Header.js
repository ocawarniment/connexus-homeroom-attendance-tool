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
        backgroundColor: '#722361',
        borderRadius: '0 0 8px 8px',
        mb: 1
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: '40px !important', px: 2 }}>
        <Avatar
          src={getSchoolLogo(school)}
          alt={`${school?.toUpperCase() || 'School'} Logo`}
          sx={{ width: 24, height: 24, mr: 1 }}
        />

        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" component="h1" fontWeight={600} sx={{ lineHeight: 1.2 }}>
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