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
  LinearProgress,
  Button,
  Stack
} from '@mui/material';
import {
  Download as DownloadIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const DownloadSection = ({ currentApproval, userSettings, downloadProgress, onDownload, onCancel }) => {
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

  useEffect(() => {
    setIsDownloading(['preparing', 'roster', 'downloading'].includes(downloadProgress?.status));
  }, [downloadProgress?.status]);

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

  const handleDateChange = async (field, value) => {
    if (field === 'startDate') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
    setManualDateMode(true);
    
    // Update chrome.storage.local immediately when dates change
    try {
      const updatedApproval = {
        ...currentApproval,
        [field]: value,
        manualDateMode: true
      };
      await chrome.storage.local.set({ currentApproval: updatedApproval });
    } catch (error) {
      console.error('Error updating date in storage:', error);
    }
  };

  const switchToAutoMode = async () => {
    const windowWeeks = userSettings?.approvalWindowWeeks || 2;
    const { startDate: autoStart, endDate: autoEnd } = calculateAutoDateRange(windowWeeks);
    setStartDate(autoStart);
    setEndDate(autoEnd);
    setManualDateMode(false);
    
    // Update chrome.storage.local when switching to auto mode
    try {
      const updatedApproval = {
        ...currentApproval,
        startDate: autoStart,
        endDate: autoEnd,
        manualDateMode: false
      };
      await chrome.storage.local.set({ currentApproval: updatedApproval });
    } catch (error) {
      console.error('Error updating auto mode in storage:', error);
    }
  };

  const switchToManualMode = async () => {
    setManualDateMode(true);
    
    // Update chrome.storage.local when switching to manual mode
    try {
      const updatedApproval = {
        ...currentApproval,
        manualDateMode: true
      };
      await chrome.storage.local.set({ currentApproval: updatedApproval });
    } catch (error) {
      console.error('Error updating manual mode in storage:', error);
    }
  };

  const handleDownload = async () => {
    if (!sectionId) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/images/icon.png',
        title: 'CHAT Extension',
        message: 'Please enter a Section ID.'
      });
      return;
    }

    let finalStartDate = startDate;
    let finalEndDate = endDate;

    // If dates are missing, automatically populate them using auto mode logic
    if (!startDate || !endDate) {
      const windowWeeks = userSettings?.approvalWindowWeeks || 2;
      const { startDate: autoStart, endDate: autoEnd } = calculateAutoDateRange(windowWeeks);
      
      finalStartDate = autoStart;
      finalEndDate = autoEnd;
      
      // Update local state
      setStartDate(autoStart);
      setEndDate(autoEnd);
      setManualDateMode(false);
      
      // Update chrome.storage.local with auto-populated dates
      try {
        const updatedApproval = {
          ...currentApproval,
          sectionId,
          startDate: autoStart,
          endDate: autoEnd,
          manualDateMode: false
        };
        await chrome.storage.local.set({ currentApproval: updatedApproval });
      } catch (error) {
        console.error('Error updating auto-populated dates in storage:', error);
      }
    }

    setIsDownloading(true);
    try {
      await onDownload(sectionId, finalStartDate, finalEndDate);
    } catch (error) {
      setIsDownloading(false);
    }
  };

  const getLastSyncDisplay = () => {
    if (!userSettings?.lastSync) return 'Never';
    return new Date(userSettings.lastSync).toLocaleString();
  };

  const windowWeeks = userSettings?.approvalWindowWeeks || 2;
  const progressActive = ['preparing', 'roster', 'downloading'].includes(downloadProgress?.status);
  const canRetry = ['error', 'cancelled'].includes(downloadProgress?.status);
  const progressValue = downloadProgress?.total
    ? Math.round((downloadProgress.completed / downloadProgress.total) * 100)
    : 0;

  return (
    <Card 
      elevation={1} 
      sx={{ 
        mb: 1,
        borderRadius: 1,
        background: 'linear-gradient(135deg, rgba(255,255,255,.82), rgba(255,242,249,.66))',
        color: '#34212f'
      }}
    >
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Stack spacing={1}>
          {progressActive && (
            <Box sx={{ px: 0.5, pt: 0.25 }} aria-live="polite">
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#722362' }}>
                  {downloadProgress.message || 'Preparing secure download…'}
                </Typography>
                {downloadProgress.total > 0 && (
                  <Typography variant="caption" color="text.secondary">{progressValue}%</Typography>
                )}
              </Box>
              <LinearProgress
                variant={downloadProgress.total ? "determinate" : "indeterminate"}
                value={progressValue}
                sx={{ height: 6, borderRadius: 99, backgroundColor: '#f1dce9', '& .MuiLinearProgress-bar': { borderRadius: 99, background: 'linear-gradient(90deg, #722362, #3d1235)' } }}
              />
            </Box>
          )}
          {canRetry && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 0.5 }} aria-live="polite">
              <Typography variant="caption" color={downloadProgress.status === 'error' ? 'error.main' : 'text.secondary'}>
                {downloadProgress.message}
              </Typography>
              <Button size="small" onClick={handleDownload} sx={{ flexShrink: 0, minWidth: 0, fontSize: '0.7rem' }}>Retry</Button>
            </Box>
          )}
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
                  '&.Mui-focused fieldset': { borderColor: '#722362' },
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
                  '&.Mui-focused fieldset': { borderColor: '#722362' },
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
                  '&.Mui-focused fieldset': { borderColor: '#722362' },
                  '& input': { padding: '4px 10px' }
                },
                '& .MuiInputLabel-root': { 
                  color: 'rgba(0, 0, 0, 0.6)',
                  fontSize: '0.7rem',
                  transform: 'translate(14px, -6px) scale(0.75)'
                }
              }}
            />

            <Tooltip title={isDownloading ? 'Stop download' : 'Download section'}>
            <IconButton
              onClick={isDownloading ? onCancel : handleDownload}
              disabled={!isDownloading && !sectionId}
              sx={{
                background: 'linear-gradient(135deg, #722362, #3d1235)',
                color: 'white',
                border: '1px solid rgba(255,255,255,.45)',
                width: 28,
                height: 28,
                flexShrink: 0,
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f1844, #2b0d26)',
                },
                '&:disabled': {
                  backgroundColor: 'rgba(114, 35, 97, 0.3)',
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                ml: 'auto'
              }}
            >
              {isDownloading ? <CloseIcon sx={{ fontSize: 15 }} /> : <DownloadIcon sx={{ fontSize: 14 }} />}
            </IconButton>
            </Tooltip>
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
