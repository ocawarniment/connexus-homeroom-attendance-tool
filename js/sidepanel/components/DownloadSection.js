import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
  Divider
} from '@mui/material';
import {
  Download as DownloadIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

const DownloadSection = ({ currentApproval, userSettings, onDownload }) => {
  const [sectionId, setSectionId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [manualDateMode, setManualDateMode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (currentApproval) {
      setSectionId(currentApproval.sectionId || '');
      setStartDate(currentApproval.startDate || '');
      setEndDate(currentApproval.endDate || '');
      setManualDateMode(currentApproval.manualDateMode || false);
    }
  }, [currentApproval]);

  const calculateAutoDateRange = (windowWeeks) => {
    const todayDate = new Date();
    const startDate = new Date(todayDate);
    
    // Set to Monday of this week
    startDate.setDate(todayDate.getDate() - (todayDate.getDay() + 7) % 7);
    // Set to previous Monday
    startDate.setDate(startDate.getDate() - 7 * windowWeeks);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6 * windowWeeks + (windowWeeks - 1));

    return {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate)
    };
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (field, value) => {
    if (field === 'startDate') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
    setManualDateMode(true);
  };

  const switchToAutoMode = () => {
    const windowWeeks = userSettings?.approvalWindowWeeks || 2;
    const { startDate: autoStart, endDate: autoEnd } = calculateAutoDateRange(windowWeeks);
    setStartDate(autoStart);
    setEndDate(autoEnd);
    setManualDateMode(false);
  };

  const handleDownload = async () => {
    if (!sectionId || !startDate || !endDate) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/images/icon.png',
        title: 'CHAT Extension',
        message: 'Please make sure you have entered a Section ID, Start Date, and End Date.'
      });
      return;
    }

    setIsDownloading(true);
    try {
      await onDownload(sectionId, startDate, endDate);
    } finally {
      setIsDownloading(false);
    }
  };

  const getLastSyncDisplay = () => {
    if (!userSettings?.lastSync) return 'Never';
    return new Date(userSettings.lastSync).toLocaleString();
  };

  const windowWeeks = userSettings?.approvalWindowWeeks || 2;

  return (
    <Card 
      elevation={1} 
      sx={{ 
        mb: 1,
        borderRadius: 1,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}
    >
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <TextField
              label="Section ID"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              size="small"
              sx={{ 
                minWidth: 80,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  height: 32,
                  fontSize: '0.75rem',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'white' }
                },
                '& .MuiInputLabel-root': { 
                  color: 'rgba(0, 0, 0, 0.6)',
                  fontSize: '0.75rem',
                  transform: 'translate(8px, 8px) scale(1)'
                },
                '& .MuiInputLabel-shrink': {
                  transform: 'translate(8px, -6px) scale(0.75)'
                }
              }}
            />
            
            <TextField
              type="date"
              label="Start"
              value={startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ 
                minWidth: 100,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  height: 32,
                  fontSize: '0.75rem',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'white' }
                },
                '& .MuiInputLabel-root': { 
                  color: 'rgba(0, 0, 0, 0.6)',
                  fontSize: '0.75rem'
                }
              }}
            />
            
            <TextField
              type="date"
              label="End"
              value={endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ 
                minWidth: 100,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  height: 32,
                  fontSize: '0.75rem',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'white' }
                },
                '& .MuiInputLabel-root': { 
                  color: 'rgba(0, 0, 0, 0.6)',
                  fontSize: '0.75rem'
                }
              }}
            />

            <Tooltip title={manualDateMode ? 'Switch to Auto Mode' : `Auto Mode (${windowWeeks} weeks)`}>
              <IconButton
                size="small"
                onClick={manualDateMode ? switchToAutoMode : undefined}
                disabled={!manualDateMode}
                sx={{
                  width: 28,
                  height: 28,
                  backgroundColor: manualDateMode ? 'rgba(255, 152, 0, 0.2)' : 'rgba(33, 150, 243, 0.2)',
                  color: manualDateMode ? '#ff9800' : '#2196f3',
                  border: `1px solid ${manualDateMode ? '#ff9800' : '#2196f3'}`,
                  '&:hover': {
                    backgroundColor: manualDateMode ? 'rgba(255, 152, 0, 0.3)' : 'rgba(33, 150, 243, 0.3)',
                  },
                  '&:disabled': {
                    opacity: 0.7,
                    color: '#2196f3',
                    borderColor: '#2196f3'
                  }
                }}
              >
                {manualDateMode ? <CalendarIcon sx={{ fontSize: 16 }} /> : <RefreshIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            </Tooltip>

            <Button
              variant="contained"
              size="small"
              startIcon={isDownloading ? <CircularProgress size={12} color="inherit" /> : <DownloadIcon sx={{ fontSize: 16 }} />}
              onClick={handleDownload}
              disabled={isDownloading || !sectionId}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontSize: '0.75rem',
                py: 0.5,
                px: 1,
                minHeight: 28,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:disabled': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                ml: 'auto'
              }}
            >
              {isDownloading ? 'Downloading...' : 'Download'}
            </Button>
          </Stack>

          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={0.5}>
              <ScheduleIcon sx={{ fontSize: 12, opacity: 0.8 }} />
              <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.65rem' }}>
                Last Sync: {getLastSyncDisplay()}
              </Typography>
            </Box>
            
            <Chip
              icon={manualDateMode ? <CalendarIcon sx={{ fontSize: 12 }} /> : <RefreshIcon sx={{ fontSize: 12 }} />}
              label={manualDateMode ? 'Manual' : `Auto (${windowWeeks}w)`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                backgroundColor: manualDateMode ? 'rgba(255, 152, 0, 0.2)' : 'rgba(33, 150, 243, 0.2)',
                color: manualDateMode ? '#ff9800' : '#2196f3',
                border: `1px solid ${manualDateMode ? 'rgba(255, 152, 0, 0.5)' : 'rgba(33, 150, 243, 0.5)'}`,
                '& .MuiChip-icon': {
                  color: manualDateMode ? '#ff9800' : '#2196f3'
                }
              }}
            />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default DownloadSection;