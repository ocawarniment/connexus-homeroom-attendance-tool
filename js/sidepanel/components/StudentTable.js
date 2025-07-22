import React from 'react';
import StudentRow from './StudentRow';

const StudentTable = ({ students, userSettings, chatLedger, onApprove }) => {
  if (!students || Object.keys(students).length === 0) {
    return (
      <div className="student-table-card">
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-title">No Students Found</div>
          <div className="empty-state-description">
            Enter your Section ID in the form above and click "Download Section" to see your students list here.
          </div>
        </div>
      </div>
    );
  }

  const getDisplayFields = () => {
    if (!chatLedger?.popupDisplay || !Array.isArray(chatLedger.popupDisplay)) {
      // Return default fields if no display configuration
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
    <div className="student-table-card">
      <table className="student-table">
        <thead>
          <tr>
            {displayFields.map(field => (
              <th key={field.field} title={field.hovertext || ''}>
                {field.displayName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {studentIds.map(studentId => (
            <StudentRow
              key={studentId}
              studentId={studentId}
              student={students[studentId]}
              displayFields={displayFields}
              userSettings={userSettings}
              chatLedger={chatLedger}
              onApprove={onApprove}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentTable;