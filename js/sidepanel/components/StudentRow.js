import React, { useState } from 'react';
import {
  TableRow,
  TableCell,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Box,
  Typography
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';

import '../../services/algorithm';

const StudentRow = ({ studentId, student, displayFields, userSettings, chatLedger, onApprove, index }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const decryptName = (encryptedName) => {
    try {
      // Check if student names should be redacted
      if (userSettings?.redactStudentNames) {
        return 'Student Name';
      }
      
      if (typeof CryptoJS !== 'undefined' && window.cryptoPass && encryptedName) {
        const decrypted = CryptoJS.AES.decrypt(encryptedName, window.cryptoPass).toString(CryptoJS.enc.Utf8);
        return decrypted || 'Student Name';
      }
      return typeof encryptedName === 'string' ? encryptedName : 'Student Name';
    } catch (error) {
      console.error('Error decrypting name:', error);
      return 'Student Name';
    }
  };

  /*
  const getStudentOutcome = (student, ledger) => {
    return [{
      state: 'approve',
      color: 'success',
      suggestion: 'Student is on track',
      summary: 'All requirements met'
    }];
  };
  */

  const getCellValue = (field, student) => {
    if (field.field === 'name') {
      return decryptName(student[field.field]);
    }
    
    if (field.field === 'approveButton') {
      return null;
    }
    
    const value = student[field.field];
    
    if (value == null || value === undefined) {
      return 'N/A';
    }
    
    if (typeof value === 'object') {
      return 'N/A';
    }
    
    return String(value);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleApprove = () => {
    const studentInfo = {
      cte: student.cteHours || 'false',
      ccp: student.ccpHours || 'false'
    };
    onApprove(studentId.replace('ST', ''), studentInfo);
  };

  const renderCell = (field) => {
    if (field.field === 'name') {
      const studentName = decryptName(student[field.field]);
      return (
        <Box display="flex" alignItems="center" gap={0.5}>
          <IconButton
            size="small"
            onClick={handleMenuClick}
            sx={{ p: 0.25, mr: 0.5 }}
          >
            <LaunchIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.75rem' }}>
            {studentName}
          </Typography>
        </Box>
      );
    }
    
    if (field.field === 'approveButton') {
      const studentOutcome = getStudentOutcome(student, chatLedger?.[userSettings?.school]);
      const outcome = studentOutcome[0] || { state: 'approve', color: 'success' };
      //outcome.color = 'error'; //success, warning, error
      const isComplete = student.complete;

      return (
        <Box display="flex" alignItems="center" gap={0.5}>
          <Button
            variant="contained"
            size="small"
            color={isComplete ? 'inherit' : outcome.color}
            //startIcon={<ApproveIcon sx={{ fontSize: 14 }} />}
            onClick={handleApprove}
            sx={{
              textDecoration: isComplete ? 'line-through' : 'none',
              backgroundColor: isComplete ? '#d3d3d3' : undefined,
              color: isComplete ? '#666666' : undefined,
              '&:hover': {
                backgroundColor: isComplete ? '#c0c0c0' : undefined,
              },
              minWidth: 80,
              fontSize: '0.7rem',
              py: 0.25,
              px: 0.5
            }}
          >
            {outcome.state.toUpperCase()}
          </Button>
          <Tooltip title={`${outcome.suggestion}\n\n${outcome.summary}`} arrow>
            <IconButton size="small" sx={{ p: 0.25 }}>
              <InfoIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        </Box>
      );
    }
    
    const cellValue = getCellValue(field, student);
    
    // Special formatting for certain fields
    if (field.field === 'attendanceStatus') {
      const color = cellValue === 'Good' ? 'success' : cellValue === 'Warning' ? 'warning' : 'error';
      return (
        <Chip 
          label={cellValue} 
          size="small" 
          color={color}
          variant="outlined"
          sx={{ fontSize: '0.65rem', height: 20 }}
        />
      );
    }
    
    return (
      <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
        {cellValue}
      </Typography>
    );
  };

  const studentLinks = chatLedger?.studentLinks || [];

  return (
    <>
      <TableRow 
        hover
        sx={{ 
          '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
          '&:hover': { backgroundColor: 'action.selected' },
          height: 32
        }}
      >
        {displayFields.map(field => (
          <TableCell key={field.field} sx={{ py: 0.25, px: 1, fontSize: '0.75rem' }}>
            {renderCell(field)}
          </TableCell>
        ))}
      </TableRow>

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: { 
            minWidth: 120,
            '& .MuiMenuItem-root': {
              fontSize: '0.75rem',
              minHeight: 28,
              py: 0.5,
              px: 1
            },
            '& .MuiListItemIcon-root': {
              minWidth: 24
            },
            '& .MuiListItemText-primary': {
              fontSize: '0.75rem'
            }
          }
        }}
      >
        {studentLinks.map((link, index) => (
          <MenuItem 
            key={index}
            onClick={() => {
              // Format href with student data
              let formattedHref = link.href;
              const placeholderRegex = /\{\{([^\}]*)\}\}/g;
              const placeholders = link.href.match(placeholderRegex) || [];
              
              placeholders.forEach(placeholder => {
                const fieldRegex = /(?<=\{\{)(.*?)(?=\}\})/g;
                const fieldName = placeholder.match(fieldRegex)?.[0];
                
                if (!fieldName) return;
                
                if (fieldName.charAt(0) === '_') {
                  const schoolFieldName = fieldName.substring(1);
                  const fieldTreeItems = schoolFieldName.split('.');
                  const schoolVars = chatLedger?.[userSettings?.school];
                  
                  let output = schoolVars;
                  fieldTreeItems.forEach(branch => {
                    output = output?.[branch];
                  });
                  
                  if (output) {
                    formattedHref = formattedHref.replace(placeholder, output);
                  }
                } else {
                  const studentValue = student[fieldName];
                  if (studentValue) {
                    formattedHref = formattedHref.replace(placeholder, studentValue);
                  }
                }
              });
              
              window.open(formattedHref, '_blank');
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <LaunchIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={link.title} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default StudentRow;