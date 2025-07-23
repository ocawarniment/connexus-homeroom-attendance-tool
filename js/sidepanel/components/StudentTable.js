import React from 'react';
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  School as SchoolIcon,
  CheckCircle as ApproveIcon,
  Info as InfoIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import StudentRow from './StudentRow';

const StudentTable = ({ students, userSettings, chatLedger, onApprove }) => {
  if (!students || Object.keys(students).length === 0) {
    return (
      <Card elevation={2} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
        <SchoolIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Students Found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enter your Section ID in the form above and click "Download Section" to see your students list here.
        </Typography>
      </Card>
    );
  }

  const getDisplayFields = () => {
    if (!chatLedger?.popupDisplay || !Array.isArray(chatLedger.popupDisplay)) {
      return [
        { field: 'id', displayName: 'ID', hovertext: '' },
        { field: 'name', displayName: 'Student', hovertext: '' },
        { field: 'approveButton', displayName: 'Actions', hovertext: '' }
      ];
    }
    
    const displayFields = userSettings?.popupTableDisplayFields || [
      'id', 'name', 'lastLogin', 'lastContact', 'attendanceStatus', 
      'escalation', 'gapDate', 'missingHours', 'approveButton'
    ];
    
    return chatLedger.popupDisplay.filter(field => 
      displayFields.includes(field.field)
    );
  };

  const displayFields = getDisplayFields();
  const studentIds = Object.keys(students);

  return (
    <Card elevation={1} sx={{ borderRadius: 1, overflow: 'hidden' }}>
      <Box sx={{ 
        py: 0.5, 
        px: 1,
        backgroundColor: 'primary.main', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5
      }}>
        <PersonIcon sx={{ fontSize: 16 }} />
        <Typography variant="subtitle2" component="h2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
          Students ({studentIds.length})
        </Typography>
      </Box>
      
      <TableContainer sx={{ maxHeight: 'calc(100vh - 120px)' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {displayFields.map(field => (
                <TableCell 
                  key={field.field}
                  sx={{ 
                    fontWeight: 600,
                    backgroundColor: 'grey.50',
                    borderBottom: 1,
                    borderColor: 'primary.main',
                    py: 0.25,
                    px: 0.5,
                    fontSize: '0.7rem',
                    lineHeight: 1.2
                  }}
                >
                  <Tooltip title={field.hovertext || ''} arrow>
                    <span>{field.displayName}</span>
                  </Tooltip>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {studentIds.map((studentId, index) => (
              <StudentRow
                key={studentId}
                studentId={studentId}
                student={students[studentId]}
                displayFields={displayFields}
                userSettings={userSettings}
                chatLedger={chatLedger}
                onApprove={onApprove}
                index={index}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

export default StudentTable;