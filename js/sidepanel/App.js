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
      main: '#722362',
      light: '#925180',
      dark: '#3d1235',
    },
    secondary: {
      main: '#5b1c4e',
      light: '#7d396c',
      dark: '#2b0d26',
    },
    background: {
      default: '#fbf7fa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Avenir Next", Avenir, "Century Gothic", ui-sans-serif, system-ui, sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    allVariants: {
      fontFamily: '"Avenir Next", Avenir, "Century Gothic", ui-sans-serif, system-ui, sans-serif',
    }
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          fontFamily: 'inherit',
        },
        'html': {
          fontFamily: 'inherit',
        },
        'body': {
          fontFamily: 'inherit',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.64)',
          boxShadow: '0 12px 30px rgba(114, 35, 98, 0.10)',
          border: '1px solid rgba(255, 255, 255, 0.78)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
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
    cancelDownload,
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

  const isLightMode = (chatData?.userSettings?.appearanceMode || 'light') === 'light';
  const boardBackground = isLightMode
    ? {
        backgroundColor: '#f0f2ef',
        backgroundImage: 'radial-gradient(ellipse 68% 45% at 28% 22%, rgba(114, 123, 118, .17) 0%, rgba(114, 123, 118, .08) 42%, transparent 74%), radial-gradient(ellipse 62% 51% at 78% 42%, rgba(122, 132, 126, .14) 0%, rgba(122, 132, 126, .06) 48%, transparent 77%), radial-gradient(ellipse 74% 30% at 42% 88%, rgba(141, 148, 143, .13) 0%, transparent 70%), linear-gradient(165deg, #ffffff 0%, #f0f2ef 52%, #e6e9e5 100%)',
        backgroundSize: 'auto, auto, auto, auto'
      }
    : {
        backgroundColor: '#102522',
        backgroundImage: 'radial-gradient(ellipse 68% 45% at 28% 22%, rgba(223, 235, 226, .14) 0%, rgba(223, 235, 226, .055) 42%, transparent 74%), radial-gradient(ellipse 62% 51% at 78% 42%, rgba(233, 241, 233, .12) 0%, rgba(233, 241, 233, .045) 48%, transparent 77%), radial-gradient(ellipse 74% 30% at 42% 88%, rgba(222, 234, 225, .10) 0%, transparent 70%), linear-gradient(135deg, #173530 0%, #0d211e 52%, #102824 100%)',
        backgroundSize: 'auto, auto, auto, auto'
      };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className={isLightMode ? 'sidepanel light-mode' : 'sidepanel dark-mode'} sx={{ height: '100vh', minHeight: '100vh', pb: 2, position: 'relative', overflow: 'hidden', ...boardBackground, '& > :not(.chalk-tray):not(.board-fade)': { position: 'relative', zIndex: 1 } }}>
        <Header 
          school={chatData?.userSettings?.school}
          onSettingsClick={() => setSettingsOpen(true)}
        />
        
        <Box sx={{ px: 1, pb: 1, minHeight: 0, overflow: 'hidden' }}>
          <DownloadSection 
            currentApproval={chatData?.currentApproval || {}}
            userSettings={chatData?.userSettings || {}}
            downloadProgress={chatData?.downloadProgress || { status: 'idle' }}
            onDownload={downloadSection}
            onCancel={cancelDownload}
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
        <Box className="board-fade" aria-hidden="true" />
        <Box className="chalk-tray" aria-hidden="true" />
      </Box>
    </ThemeProvider>
  );
};

export default App;
