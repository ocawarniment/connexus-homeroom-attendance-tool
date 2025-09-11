import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Card,
  CardContent,
  Button,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  Link,
  Avatar
} from '@mui/material';
import {
  Close as CloseIcon,
  Info as InfoIcon,
  School as SchoolIcon,
  Update as UpdateIcon,
  Settings as SettingsIcon,
  Description as DocumentIcon,
  CalendarToday as CalendarIcon,
  ViewColumn as ColumnIcon,
  Subject as SubjectIcon,
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon
} from '@mui/icons-material';

const SettingsPanel = ({ isOpen, onClose, userSettings, chatLedger, onUpdateSettings, onRefreshData }) => {
  const [settings, setSettings] = useState({});
  const [approvalWindow, setApprovalWindow] = useState(2);
  const [extensionVersion, setExtensionVersion] = useState('2.0.1');
  const [chatLedgerVersion, setChatLedgerVersion] = useState('Loading...');
  const [developerModeClickCount, setDeveloperModeClickCount] = useState(0);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);

  useEffect(() => {
    if (userSettings) {
      setSettings(userSettings);
      setApprovalWindow(userSettings.approvalWindowWeeks || 2);
      setIsDeveloperMode(userSettings.developerMode || false);
    }
  }, [userSettings]);

  useEffect(() => {
    if (chatLedger) {
      setChatLedgerVersion(chatLedger.version || 'Unknown');
    }
  }, [chatLedger]);

  useEffect(() => {
    // Load extension version from manifest
    fetch('./manifest.json')
      .then(response => response.json())
      .then(manifest => {
        setExtensionVersion(manifest.version || '2.0.1');
      })
      .catch(error => {
        console.error('Error loading manifest:', error);
        setExtensionVersion('Error');
      });
  }, []);

  const handleSchoolChange = (school) => {
    const newSettings = { ...settings, school };
    setSettings(newSettings);
    onUpdateSettings(newSettings);
  };

  const handleCompletionMetricChange = (metric) => {
    const newSettings = { ...settings, completionMetric: metric };
    setSettings(newSettings);
    onUpdateSettings(newSettings);
    
    // Show notification about redownloading section
    const message = metric === 'overdue' 
      ? 'This can only be downloaded for sections where you are the homeroom teacher.\n\nBe sure to redownload this section after switching this setting.'
      : 'Be sure to redownload this section after switching this setting.';
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/images/icon.png',
      title: 'CHAT Extension',
      message
    });
  };

  const handleApprovalWindowChange = (delta) => {
    const newValue = approvalWindow + delta;
    if (newValue < 1 || newValue > 4) {
      const message = newValue < 1 
        ? 'Approval window must be at least 1 week.'
        : 'Approval window cannot exceed 4 weeks.';
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/images/icon.png',
        title: 'CHAT Extension',
        message
      });
      return;
    }
    
    setApprovalWindow(newValue);
    const newSettings = { ...settings, approvalWindowWeeks: newValue };
    setSettings(newSettings);
    onUpdateSettings(newSettings);
  };

  const handleTableFieldChange = (field, checked) => {
    const currentFields = settings.popupTableDisplayFields || [];
    const newFields = checked 
      ? [...currentFields, field]
      : currentFields.filter(f => f !== field);
    
    const newSettings = { ...settings, popupTableDisplayFields: newFields };
    setSettings(newSettings);
    onUpdateSettings(newSettings);
  };

  const handleSelectAllFields = () => {
    const allFields = chatLedger?.popupDisplay?.map(field => field.field) || [];
    const newSettings = { ...settings, popupTableDisplayFields: allFields };
    setSettings(newSettings);
    onUpdateSettings(newSettings);
  };

  const handleDeselectAllFields = () => {
    const requiredFields = ['id', 'name', 'approveButton'];
    const newSettings = { ...settings, popupTableDisplayFields: requiredFields };
    setSettings(newSettings);
    onUpdateSettings(newSettings);
  };

  const handleSubjectChange = (subject) => {
    const newSettings = { ...settings, liveLessonSubject: subject };
    setSettings(newSettings);
    onUpdateSettings(newSettings);
  };

  const handleAboutIconClick = () => {
    const newCount = developerModeClickCount + 1;
    setDeveloperModeClickCount(newCount);
    
    if (newCount >= 10) {
      setIsDeveloperMode(true);
      const newSettings = { ...settings, developerMode: true };
      setSettings(newSettings);
      onUpdateSettings(newSettings);
      setDeveloperModeClickCount(0);
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/images/icon.png',
        title: 'CHAT Extension',
        message: 'Developer Mode activated!'
      });
    }
  };

  const handleDeveloperSettingChange = (setting, value) => {
    const newSettings = { ...settings, [setting]: value };
    setSettings(newSettings);
    onUpdateSettings(newSettings);
  };

  const updateChatLedger = async () => {
    chrome.runtime.sendMessage({ type: 'updateChatLedger' });
    
    // Simple one-time listener for storage changes
    const handleStorageChange = (changes) => {
      if (changes.chatLedger) {
        const newChatLedger = changes.chatLedger.newValue;
        if (newChatLedger && newChatLedger.version) {
          setChatLedgerVersion(newChatLedger.version);
          // Remove listener immediately after first update
          chrome.storage.onChanged.removeListener(handleStorageChange);
        }
      }
    };

    // Add listener for storage changes
    chrome.storage.onChanged.addListener(handleStorageChange);
    
    // Clean up listener after 10 seconds as a safety measure
    setTimeout(() => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    }, 10000);
  };

  const displayFields = Array.isArray(chatLedger?.popupDisplay) ? chatLedger.popupDisplay : [];
  const selectedFields = Array.isArray(settings.popupTableDisplayFields) ? settings.popupTableDisplayFields : [];

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        sx: { 
          width: 300,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }
      }}
    >
      <Box sx={{ p: 1.5, height: '100%', overflow: 'auto' }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <SettingsIcon color="primary" sx={{ fontSize: 18 }} />
            <Typography variant="subtitle1" fontWeight={600} sx={{ fontSize: '0.9rem' }}>
              Settings
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ p: 0.5 }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Stack spacing={1.5}>
          {/* About Section */}
          <Card elevation={1}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                <IconButton 
                  onClick={handleAboutIconClick}
                  size="small"
                  sx={{ p: 0, mr: 0.5 }}
                >
                  <InfoIcon color="primary" sx={{ fontSize: 16 }} />
                </IconButton>
                <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                  About
                </Typography>
              </Box>
              
              <Stack spacing={1}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                    Extension: <strong>{extensionVersion}</strong>
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<UpdateIcon sx={{ fontSize: 14 }} />}
                    href={chatLedger?.extensionDownloadUrl || '#'}
                    target="_blank"
                    sx={{ py: 0.25, px: 0.75, fontSize: '0.7rem', minWidth: 'auto' }}
                  >
                    Update
                  </Button>
                </Box>
                
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                    CHAT Ledger: <strong>{chatLedgerVersion}</strong>
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<UpdateIcon sx={{ fontSize: 14 }} />}
                    onClick={updateChatLedger}
                    sx={{ py: 0.25, px: 0.75, fontSize: '0.7rem', minWidth: 'auto' }}
                  >
                    Update
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Developer Settings */}
          {isDeveloperMode && (
            <Card elevation={1} sx={{ border: '2px solid #ff9800' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                  <SettingsIcon color="warning" sx={{ fontSize: 16 }} />
                  <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.8rem', color: '#ff9800' }}>
                    Developer Settings
                  </Typography>
                </Box>
                
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={settings.downloadAllStudents || false}
                        onChange={(e) => handleDeveloperSettingChange('downloadAllStudents', e.target.checked)}
                        size="small"
                        sx={{ p: 0.25 }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                        Download All Students Regardless of Stage
                      </Typography>
                    }
                    sx={{ my: 0 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={settings.redactStudentNames || false}
                        onChange={(e) => handleDeveloperSettingChange('redactStudentNames', e.target.checked)}
                        size="small"
                        sx={{ p: 0.25 }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                        Redact Student Names
                      </Typography>
                    }
                    sx={{ my: 0 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={settings.randomizeOverdueCounts || false}
                        onChange={(e) => handleDeveloperSettingChange('randomizeOverdueCounts', e.target.checked)}
                        size="small"
                        sx={{ p: 0.25 }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                        Randomize Overdue Lesson Counts
                      </Typography>
                    }
                    sx={{ my: 0 }}
                  />
                </FormGroup>
              </CardContent>
            </Card>
          )}

          {/* Reference Manual */}
          <Card elevation={1}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                <DocumentIcon color="primary" sx={{ fontSize: 16 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                  Reference Manual
                </Typography>
              </Box>
              
              <Link
                href="https://docs.google.com/document/d/1DL0lgLSLl7N3Rut7me5ucpvEM8-I-Vgdz587ZmleN_U/edit#heading=h.c818bjawl1ng"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none' }}
              >
                <DocumentIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  Frequently Asked Questions
                </Typography>
              </Link>
            </CardContent>
          </Card>

          {/* School Selection */}
          <Card elevation={1}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                <SchoolIcon color="primary" sx={{ fontSize: 16 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                  School
                </Typography>
              </Box>
              
              <ToggleButtonGroup
                value={settings.school}
                exclusive
                onChange={(e, value) => value && handleSchoolChange(value)}
                fullWidth
                size="small"
                sx={{ '& .MuiToggleButton-root': { py: 0.25, fontSize: '0.75rem' } }}
              >
                <ToggleButton value="oca">OCA</ToggleButton>
                <ToggleButton value="grca">GRCA</ToggleButton>
              </ToggleButtonGroup>
            </CardContent>
          </Card>

          {/* Approval Window */}
          <Card elevation={1}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                <CalendarIcon color="primary" sx={{ fontSize: 16 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                  Approval Window
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center" gap={0.5}>
                <TextField
                  value={approvalWindow}
                  size="small"
                  InputProps={{ 
                    readOnly: true,
                    sx: { height: 28, fontSize: '0.75rem' }
                  }}
                  sx={{ width: 60 }}
                />
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>weeks</Typography>
                <Box ml="auto" display="flex" flexDirection="column">
                  <IconButton 
                    size="small" 
                    onClick={() => handleApprovalWindowChange(1)}
                    disabled={approvalWindow >= 4}
                    sx={{ p: 0.25, minWidth: 24, minHeight: 24 }}
                  >
                    <ArrowUpIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleApprovalWindowChange(-1)}
                    disabled={approvalWindow <= 1}
                    sx={{ p: 0.25, minWidth: 24, minHeight: 24 }}
                  >
                    <ArrowDownIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Table Fields */}
          <Card elevation={1}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                <ColumnIcon color="primary" sx={{ fontSize: 16 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                  Table Fields
                </Typography>
              </Box>
              
              <Stack spacing={1}>
                <Box display="flex" gap={0.5}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleSelectAllFields}
                    fullWidth
                    sx={{ py: 0.25, fontSize: '0.7rem' }}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleDeselectAllFields}
                    fullWidth
                    sx={{ py: 0.25, fontSize: '0.7rem' }}
                  >
                    Deselect All
                  </Button>
                </Box>
                
                <FormGroup>
                  {displayFields.map(field => {
                    const isRequired = ['id', 'name', 'approveButton'].includes(field.field);
                    const isChecked = selectedFields.includes(field.field) || isRequired;
                    
                    return (
                      <FormControlLabel
                        key={field.field}
                        control={
                          <Checkbox
                            checked={isChecked}
                            disabled={isRequired}
                            onChange={(e) => handleTableFieldChange(field.field, e.target.checked)}
                            size="small"
                            sx={{ p: 0.25 }}
                          />
                        }
                        label={
                          <Typography variant="body2" title={field.hovertext || ''} sx={{ fontSize: '0.75rem' }}>
                            {field.displayName}
                          </Typography>
                        }
                        sx={{ my: 0 }}
                      />
                    );
                  })}
                </FormGroup>
              </Stack>
            </CardContent>
          </Card>

          {/* Lesson Completion Measure (OCA Only) */}
          {settings.school === 'oca' && (
            <Card elevation={1}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                  <CalendarIcon color="primary" sx={{ fontSize: 16 }} />
                  <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                    Lesson Completion Measure
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={1} sx={{ fontSize: '0.7rem' }}>
                  Attendance guidance calculations and button color coding will be based on the selected measure.
                </Typography>
                
                <ToggleButtonGroup
                  value={settings.completionMetric}
                  exclusive
                  onChange={(e, value) => value && handleCompletionMetricChange(value)}
                  orientation="vertical"
                  fullWidth
                  size="small"
                  sx={{ '& .MuiToggleButton-root': { py: 0.25, fontSize: '0.75rem' } }}
                >
                  <ToggleButton value="behind">Lessons Behind</ToggleButton>
                  <ToggleButton value="overdue">Overdue Lessons</ToggleButton>
                </ToggleButtonGroup>
              </CardContent>
            </Card>
          )}

          {/* LiveLesson Default Subject */}
          <Card elevation={1}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                <SubjectIcon color="primary" sx={{ fontSize: 16 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                  LiveLesson Default Subject
                </Typography>
              </Box>
              
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.75rem' }}>Subject</InputLabel>
                <Select
                  value={settings.liveLessonSubject || 'None'}
                  label="Subject"
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  sx={{ 
                    height: 32,
                    fontSize: '0.75rem',
                    '& .MuiSelect-select': { 
                      paddingTop: '4px',
                      paddingBottom: '4px'
                    }
                  }}
                >
                  <MenuItem value="None" sx={{ fontSize: '0.75rem' }}>None</MenuItem>
                  <MenuItem value="Math" sx={{ fontSize: '0.75rem' }}>Math</MenuItem>
                  <MenuItem value="Language Arts" sx={{ fontSize: '0.75rem' }}>Language Arts</MenuItem>
                  <MenuItem value="Science" sx={{ fontSize: '0.75rem' }}>Science</MenuItem>
                  <MenuItem value="Behavior" sx={{ fontSize: '0.75rem' }}>Behavior</MenuItem>
                  <MenuItem value="Social Studies" sx={{ fontSize: '0.75rem' }}>Social Studies</MenuItem>
                  <MenuItem value="Other Course" sx={{ fontSize: '0.75rem' }}>Other Course</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Drawer>
  );
};

export default SettingsPanel;