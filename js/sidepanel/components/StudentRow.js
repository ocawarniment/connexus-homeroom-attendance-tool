import React, { useState } from 'react';
import StudentDropdown from './StudentDropdown';

const StudentRow = ({ studentId, student, displayFields, userSettings, chatLedger, onApprove }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const decryptName = (encryptedName) => {
    try {
      // Check if CryptoJS is available and we have a crypto pass
      if (typeof CryptoJS !== 'undefined' && window.cryptoPass && encryptedName) {
        const decrypted = CryptoJS.AES.decrypt(encryptedName, window.cryptoPass).toString(CryptoJS.enc.Utf8);
        return decrypted || 'Student Name';
      }
      // Fallback to encrypted name or placeholder
      return typeof encryptedName === 'string' ? encryptedName : 'Student Name';
    } catch (error) {
      console.error('Error decrypting name:', error);
      return 'Student Name';
    }
  };

  const getStudentOutcome = (student, ledger) => {
    // This would implement the algorithm logic from the original popup.js
    // For now, return a default outcome
    return [{
      state: 'approve',
      color: '#28a745',
      suggestion: 'Student is on track',
      summary: 'All requirements met'
    }];
  };

  const getCellValue = (field, student) => {
    if (field.field === 'name') {
      return decryptName(student[field.field]);
    }
    
    if (field.field === 'approveButton') {
      return null; // Handled separately
    }
    
    const value = student[field.field];
    
    // Ensure we return a string or number, not an object
    if (value == null || value === undefined) {
      return 'N/A';
    }
    
    // If it's an object, convert to string or return N/A
    if (typeof value === 'object') {
      return 'N/A';
    }
    
    return String(value);
  };

  const renderApproveButton = () => {
    const studentOutcome = getStudentOutcome(student, chatLedger?.[userSettings?.school]);
    const outcome = studentOutcome[0] || { state: 'approve', color: '#28a745' };
    
    const handleApprove = () => {
      const studentInfo = {
        cte: student.cteHours || 'false',
        ccp: student.ccpHours || 'false'
      };
      onApprove(studentId.replace('ST', ''), studentInfo);
    };

    const isComplete = student.complete;

    return (
      <div className="student-actions">
        <button
          className={`approve-btn ${outcome.state}`}
          style={{ 
            backgroundColor: outcome.color,
            textDecoration: isComplete ? 'line-through' : 'none'
          }}
          onClick={handleApprove}
          title={outcome.suggestion}
        >
          {outcome.state.toUpperCase()}
        </button>
        <div className="tooltip">
          <button className="info-btn">ⓘ</button>
          <span className="tooltiptext">
            {outcome.suggestion}
            {outcome.summary && (
              <>
                <br /><br />
                {outcome.summary}
              </>
            )}
          </span>
        </div>
      </div>
    );
  };

  const renderCell = (field) => {
    if (field.field === 'name') {
      return (
        <StudentDropdown
          studentId={studentId}
          studentName={decryptName(student[field.field])}
          student={student}
          chatLedger={chatLedger}
          userSettings={userSettings}
          isOpen={dropdownOpen}
          onToggle={() => setDropdownOpen(!dropdownOpen)}
        />
      );
    }
    
    if (field.field === 'approveButton') {
      return renderApproveButton();
    }
    
    return getCellValue(field, student);
  };

  return (
    <tr id={`tr-${studentId}`}>
      {displayFields.map(field => (
        <td key={field.field} className={`td-${field.field}`}>
          {renderCell(field)}
        </td>
      ))}
    </tr>
  );
};

export default StudentRow;