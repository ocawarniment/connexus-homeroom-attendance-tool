import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, Container } from '@mui/material';
import Header from './components/Header';
import DownloadSection from './components/DownloadSection';
import StudentTable from './components/StudentTable';
import SettingsPanel from './components/SettingsPanel';
import { useExtensionData } from './hooks/useExtensionData';

const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
      light: '#9bb5ff',
      dark: '#3f51b5',
    },
    secondary: {
      main: '#764ba2',
      light: '#a478d4',
      dark: '#4a2c73',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Onest", sans-serif',
    h1: { fontFamily: '"Onest", sans-serif' },
    h2: { fontFamily: '"Onest", sans-serif' },
    h3: { fontFamily: '"Onest", sans-serif' },
    h4: { fontFamily: '"Onest", sans-serif' },
    h5: { fontFamily: '"Onest", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Onest", sans-serif', fontWeight: 600 },
    subtitle1: { fontFamily: '"Onest", sans-serif' },
    subtitle2: { fontFamily: '"Onest", sans-serif' },
    body1: { fontFamily: '"Onest", sans-serif' },
    body2: { fontFamily: '"Onest", sans-serif' },
    button: { fontFamily: '"Onest", sans-serif' },
    caption: { fontFamily: '"Onest", sans-serif' },
    overline: { fontFamily: '"Onest", sans-serif' },
    allVariants: {
      fontFamily: '"Onest", sans-serif',
    }
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          fontFamily: '"Onest", sans-serif !important',
        },
        'html': {
          fontFamily: '"Onest", sans-serif !important',
        },
        'body': {
          fontFamily: '"Onest", sans-serif !important',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
          fontFamily: '"Onest", sans-serif',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontFamily: '"Onest", sans-serif',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily: '"Onest", sans-serif',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          fontFamily: '"Onest", sans-serif',
          '& .MuiInputBase-input': {
            fontFamily: '"Onest", sans-serif',
          },
          '& .MuiInputLabel-root': {
            fontFamily: '"Onest", sans-serif',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontFamily: '"Onest", sans-serif',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: '"Onest", sans-serif',
        },
      },
    },
  },
});

const App = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { 
    chatData, 
    loading, 
    downloadSection, 
    approveAttendance,
    updateSettings,
    refreshData 
  } = useExtensionData();

  useEffect(() => {
    // Initialize extension data on mount
    refreshData();
  }, []);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box 
          display="flex" 
          alignItems="center" 
          justifyContent="center" 
          height="100vh"
          flexDirection="column"
          gap={2}
        >
          <div className="spinner"></div>
          Loading extension data...
        </Box>
      </ThemeProvider>
    );
  }

  // Handle case where data failed to load
  if (!chatData) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box 
          display="flex" 
          alignItems="center" 
          justifyContent="center" 
          height="100vh"
          flexDirection="column"
          gap={2}
        >
          <div>Failed to load extension data. Please try refreshing.</div>
          <button onClick={refreshData} className="btn btn-primary">
            Retry
          </button>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Header 
          school={chatData?.userSettings?.school}
          onSettingsClick={() => setSettingsOpen(true)}
        />
        
        <Box sx={{ px: 1, pb: 1 }}>
          <DownloadSection 
            currentApproval={chatData?.currentApproval || {}}
            userSettings={chatData?.userSettings || {}}
            onDownload={downloadSection}
          />
          
          <StudentTable 
            students={chatData?.students || {}}
            userSettings={chatData?.userSettings || {}}
            chatLedger={chatData?.chatLedger || {}}
            onApprove={approveAttendance}
            sectionName={chatData?.sectionName}
          />
        </Box>

        <SettingsPanel
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          userSettings={chatData?.userSettings || {}}
          chatLedger={chatData?.chatLedger || {}}
          onUpdateSettings={updateSettings}
          onRefreshData={refreshData}
        />
      </Box>
    </ThemeProvider>
  );
};

export default App;