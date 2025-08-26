import React, { useRef, useEffect } from 'react';

const StudentDropdown = ({ 
  studentId, 
  studentName, 
  student, 
  chatLedger, 
  userSettings, 
  isOpen, 
  onToggle 
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const formatHref = (link) => {
    let formattedHref = link.href;
    const placeholderRegex = /\{\{([^\}]*)\}\}/g;
    const placeholders = link.href.match(placeholderRegex) || [];
    
    placeholders.forEach(placeholder => {
      const fieldRegex = /(?<=\{\{)(.*?)(?=\}\})/g;
      const fieldName = placeholder.match(fieldRegex)?.[0];
      
      if (!fieldName) return;
      
      if (fieldName.charAt(0) === '_') {
        // School variable
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
        // Student variable
        const studentValue = student[fieldName];
        if (studentValue) {
          formattedHref = formattedHref.replace(placeholder, studentValue);
        }
      }
    });
    
    return formattedHref;
  };

  const studentLinks = chatLedger?.studentLinks || [];

  return (
    <div className="student-dropdown" ref={dropdownRef}>
      <button 
        className="dropdown-toggle"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        {studentName}
      </button>
      
      {isOpen && (
        <div className="dropdown-menu show">
          {studentLinks.map((link, index) => (
            <a
              key={index}
              className="dropdown-item"
              href={formatHref(link)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onToggle()}
            >
              {link.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentDropdown;