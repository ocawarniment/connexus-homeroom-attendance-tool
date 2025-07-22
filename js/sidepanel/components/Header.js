import React from 'react';

const Header = ({ school, onSettingsClick }) => {
  const getSchoolLogo = (schoolCode) => {
    return `images/${schoolCode || 'oca'}logo.png`;
  };

  return (
    <header className="header">
      <img 
        src={getSchoolLogo(school)} 
        alt={`${school?.toUpperCase() || 'School'} Logo`}
        className="school-logo"
      />
      <h1 className="header-title">CHAT Extension</h1>
      <div style={{ marginLeft: 'auto' }}>
        <button 
          className="btn btn-secondary"
          onClick={onSettingsClick}
          aria-label="Open Settings"
        >
          Settings
        </button>
      </div>
    </header>
  );
};

export default Header;