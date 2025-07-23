import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar
} from '@mui/material';
import {
  Settings as SettingsIcon
} from '@mui/icons-material';

const Header = ({ school, onSettingsClick }) => {
  const getSchoolLogo = (schoolCode) => {
    return `images/${schoolCode || 'oca'}logo.png`;
  };

  return (
    <AppBar 
      position="static" 
      elevation={1}
      sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            CHAT Extension
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="small"
          startIcon={<SettingsIcon sx={{ fontSize: 16 }} />}
          onClick={onSettingsClick}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontSize: '0.75rem',
            py: 0.5,
            px: 1,
            minWidth: 'auto',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
            }
          }}
        >
          Settings
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Header;