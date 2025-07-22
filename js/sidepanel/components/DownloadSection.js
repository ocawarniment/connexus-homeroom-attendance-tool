import React, { useState, useEffect } from 'react';

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
    <div className="download-card">
      <div className="download-form">
        <div className="form-group">
          <label className="form-label" htmlFor="sectionId">Section ID</label>
          <input
            id="sectionId"
            type="text"
            className="form-input"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            placeholder="Enter section ID"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Date Range</label>
          <div className="date-range">
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
            />
            <span>to</span>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
            />
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>
              <div className="spinner"></div>
              Downloading...
            </>
          ) : (
            'Download Section'
          )}
        </button>

        <div 
          className={`date-banner ${manualDateMode ? 'manual' : 'auto'}`}
          onClick={manualDateMode ? switchToAutoMode : undefined}
          style={{ cursor: manualDateMode ? 'pointer' : 'default' }}
        >
          {manualDateMode 
            ? 'Manual Date Mode - Click HERE to switch back to automatic.'
            : `Auto Date Mode - ${windowWeeks} Week Approval Window`
          }
        </div>

        <div className="last-sync">
          Last Sync: {getLastSyncDisplay()}
        </div>
      </div>
    </div>
  );
};

export default DownloadSection;