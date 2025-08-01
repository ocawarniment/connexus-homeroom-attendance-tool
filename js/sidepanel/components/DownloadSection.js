import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Chip,
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack
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

  const switchToManualMode = () => {
    setManualDateMode(true);
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
        backgroundColor: '#f5f5f5',
        color: '#333'
      }}
    >
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Stack spacing={1}>
          {/* First Row: Section ID, Start, End, Download */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <TextField
              label="Section ID"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              size="small"
              sx={{ 
                width: 70,
                flexShrink: 0,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                  height: 28,
                  fontSize: '0.7rem',
                  '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.23)' },
                  '&:hover fieldset': { borderColor: 'rgba(0, 0, 0, 0.4)' },
                  '&.Mui-focused fieldset': { borderColor: '#722361' },
                  '& input': { padding: '4px 10px' }
                },
                '& .MuiInputLabel-root': { 
                  color: 'rgba(0, 0, 0, 0.6)',
                  fontSize: '0.7rem',
                  transform: 'translate(14px, 6px) scale(1)'
                },
                '& .MuiInputLabel-shrink': {
                  transform: 'translate(14px, -6px) scale(0.75)'
                }
              }}
            />
            
            <TextField
              type="date"
              label="Start"
              value={startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ 
                width: 110,
                flexShrink: 0,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                  height: 28,
                  fontSize: '0.7rem',
                  '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.23)' },
                  '&:hover fieldset': { borderColor: 'rgba(0, 0, 0, 0.4)' },
                  '&.Mui-focused fieldset': { borderColor: '#722361' },
                  '& input': { padding: '4px 10px' }
                },
                '& .MuiInputLabel-root': { 
                  color: 'rgba(0, 0, 0, 0.6)',
                  fontSize: '0.7rem',
                  transform: 'translate(14px, -6px) scale(0.75)'
                }
              }}
            />
            
            <TextField
              type="date"
              label="End"
              value={endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ 
                width: 110,
                flexShrink: 0,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                  height: 28,
                  fontSize: '0.7rem',
                  '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.23)' },
                  '&:hover fieldset': { borderColor: 'rgba(0, 0, 0, 0.4)' },
                  '&.Mui-focused fieldset': { borderColor: '#722361' },
                  '& input': { padding: '4px 10px' }
                },
                '& .MuiInputLabel-root': { 
                  color: 'rgba(0, 0, 0, 0.6)',
                  fontSize: '0.7rem',
                  transform: 'translate(14px, -6px) scale(0.75)'
                }
              }}
            />

            <IconButton
              onClick={handleDownload}
              disabled={isDownloading || !sectionId}
              sx={{
                backgroundColor: '#722361',
                color: 'white',
                border: '1px solid #722361',
                width: 28,
                height: 28,
                flexShrink: 0,
                '&:hover': {
                  backgroundColor: '#5a1c4d',
                },
                '&:disabled': {
                  backgroundColor: 'rgba(114, 35, 97, 0.3)',
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                ml: 'auto'
              }}
            >
              {isDownloading ? <CircularProgress size={12} color="inherit" /> : <DownloadIcon sx={{ fontSize: 14 }} />}
            </IconButton>
          </Stack>

          {/* Second Row: Last Sync and Mode Pill */}
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={0.5}>
              <ScheduleIcon sx={{ fontSize: 12, color: '#666' }} />
              <Typography variant="caption" sx={{ color: '#666', fontSize: '0.65rem' }}>
                Last Sync: {getLastSyncDisplay()}
              </Typography>
            </Box>
            
            <Box display="flex" alignItems="center" gap={0.5}>
              <Chip
                icon={manualDateMode ? <CalendarIcon sx={{ fontSize: 12 }} /> : <RefreshIcon sx={{ fontSize: 12 }} />}
                label={manualDateMode ? 'Manual' : `Auto (${windowWeeks}w)`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  backgroundColor: manualDateMode ? 'rgba(255, 193, 7, 0.2)' : 'rgba(76, 175, 80, 0.2)',
                  color: manualDateMode ? '#f57c00' : '#388e3c',
                  border: `1px solid ${manualDateMode ? 'rgba(255, 193, 7, 0.5)' : 'rgba(76, 175, 80, 0.5)'}`,
                  '& .MuiChip-icon': {
                    color: manualDateMode ? '#f57c00' : '#388e3c'
                  }
                }}
              />
              
              <Tooltip title={manualDateMode ? 'Switch to Auto Mode' : 'Switch to Manual Mode'}>
                <IconButton
                  size="small"
                  onClick={manualDateMode ? switchToAutoMode : switchToManualMode}
                  sx={{
                    width: 20,
                    height: 20,
                    backgroundColor: manualDateMode ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 193, 7, 0.2)',
                    color: manualDateMode ? '#388e3c' : '#f57c00',
                    border: `1px solid ${manualDateMode ? '#388e3c' : '#f57c00'}`,
                    '&:hover': {
                      backgroundColor: manualDateMode ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 193, 7, 0.3)',
                    }
                  }}
                >
                  {manualDateMode ? <RefreshIcon sx={{ fontSize: 12 }} /> : <CalendarIcon sx={{ fontSize: 12 }} />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default DownloadSection;