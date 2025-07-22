import React, { useState, useEffect } from 'react';

const SettingsPanel = ({ isOpen, onClose, userSettings, chatLedger, onUpdateSettings, onRefreshData }) => {
  const [settings, setSettings] = useState({});
  const [approvalWindow, setApprovalWindow] = useState(2);
  const [extensionVersion, setExtensionVersion] = useState('2.0.1');
  const [chatLedgerVersion, setChatLedgerVersion] = useState('Loading...');

  useEffect(() => {
    if (userSettings) {
      setSettings(userSettings);
      setApprovalWindow(userSettings.approvalWindowWeeks || 2);
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

  const updateChatLedger = async () => {
    chrome.runtime.sendMessage({ type: 'updateChatLedger' });
    
    // Listen for storage changes to update the version display
    const handleStorageChange = (changes) => {
      if (changes.chatLedger) {
        const newChatLedger = changes.chatLedger.newValue;
        if (newChatLedger && newChatLedger.version) {
          setChatLedgerVersion(newChatLedger.version);
          // Also refresh the parent component data
          if (onRefreshData) {
            onRefreshData();
          }
        }
      }
    };

    // Add listener for storage changes
    chrome.storage.onChanged.addListener(handleStorageChange);
    
    // Also poll for changes as a backup
    const pollForChanges = async () => {
      try {
        const result = await chrome.storage.local.get(['chatLedger']);
        if (result.chatLedger && result.chatLedger.version) {
          const newVersion = result.chatLedger.version;
          if (newVersion !== chatLedgerVersion) {
            setChatLedgerVersion(newVersion);
            if (onRefreshData) {
              onRefreshData();
            }
          }
        }
      } catch (error) {
        console.error('Error polling for chatLedger changes:', error);
      }
    };

    // Poll every 500ms for 5 seconds
    const pollInterval = setInterval(pollForChanges, 500);
    
    // Clean up after 5 seconds
    setTimeout(() => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      clearInterval(pollInterval);
    }, 5000);
  };

  const displayFields = Array.isArray(chatLedger?.popupDisplay) ? chatLedger.popupDisplay : [];
  const selectedFields = Array.isArray(settings.popupTableDisplayFields) ? settings.popupTableDisplayFields : [];

  return (
    <div className={`settings-panel ${isOpen ? 'open' : ''}`}>
      <div className="settings-header">
        <h2 className="settings-title">Settings</h2>
        <button className="close-btn" onClick={onClose} aria-label="Close Settings">
          ×
        </button>
      </div>
      
      <div className="settings-content">
        {/* About Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">About</h3>
          <div style={{ marginBottom: '12px' }}>
            <span>Extension Version: </span>
            <span id="extVersNum">{extensionVersion}</span>
            <a 
              href={chatLedger?.extensionDownloadUrl || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ marginLeft: '12px' }}
            >
              <button className="btn btn-outline">Update</button>
            </a>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <span>CHAT Ledger Version: </span>
            <span id="chatVersNum">{chatLedgerVersion}</span>
            <button 
              className="btn btn-outline" 
              onClick={updateChatLedger}
              style={{ marginLeft: '12px' }}
            >
              Update
            </button>
          </div>
        </div>

        {/* Reference Manual */}
        <div className="settings-section">
          <h3 className="settings-section-title">Reference Manual</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/images/google_docs_logo.png" width="24" height="24" alt="Google Docs" />
            <a 
              href="https://docs.google.com/document/d/1DL0lgLSLl7N3Rut7me5ucpvEM8-I-Vgdz587ZmleN_U/edit#heading=h.c818bjawl1ng" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Frequently Asked Questions
            </a>
          </div>
        </div>

        {/* School Selection */}
        <div className="settings-section">
          <h3 className="settings-section-title">School</h3>
          <div className="btn-group">
            <button
              className={`btn ${settings.school === 'oca' ? 'active' : 'btn-outline'}`}
              onClick={() => handleSchoolChange('oca')}
            >
              OCA
            </button>
            <button
              className={`btn ${settings.school === 'grca' ? 'active' : 'btn-outline'}`}
              onClick={() => handleSchoolChange('grca')}
            >
              GRCA
            </button>
          </div>
        </div>

        {/* Approval Window */}
        <div className="settings-section">
          <h3 className="settings-section-title">Number of Weeks in Approval Window</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="text" 
              value={approvalWindow} 
              readOnly 
              className="form-input"
              style={{ width: '60px', textAlign: 'center' }}
            />
            <button 
              className="btn btn-outline"
              onClick={() => handleApprovalWindowChange(-1)}
            >
              ⇩
            </button>
            <button 
              className="btn btn-outline"
              onClick={() => handleApprovalWindowChange(1)}
            >
              ⇧
            </button>
          </div>
        </div>

        {/* Table Fields */}
        <div className="settings-section">
          <h3 className="settings-section-title">Table Fields</h3>
          <div className="btn-group" style={{ marginBottom: '12px' }}>
            <button className="btn btn-outline" onClick={handleSelectAllFields}>
              Select All
            </button>
            <button className="btn btn-outline" onClick={handleDeselectAllFields}>
              Deselect All
            </button>
          </div>
          <div className="checkbox-group">
            {displayFields.map(field => {
              const isRequired = ['id', 'name', 'approveButton'].includes(field.field);
              const isChecked = selectedFields.includes(field.field) || isRequired;
              
              return (
                <div key={field.field} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`cb_${field.field}`}
                    checked={isChecked}
                    disabled={isRequired}
                    onChange={(e) => handleTableFieldChange(field.field, e.target.checked)}
                  />
                  <label 
                    htmlFor={`cb_${field.field}`}
                    title={field.hovertext || ''}
                  >
                    {field.displayName}
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lesson Completion Measure (OCA Only) */}
        {settings.school === 'oca' && (
          <div className="settings-section">
            <h3 className="settings-section-title">Lesson Completion Measure (OCA Only)</h3>
            <p style={{ fontSize: '13px', marginBottom: '12px', color: '#6c757d' }}>
              Attendance guidance calculations and button color coding will be based on the selected lesson completion measure.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className={`btn ${settings.completionMetric === 'behind' ? 'active' : 'btn-outline'}`}
                onClick={() => handleCompletionMetricChange('behind')}
              >
                Lessons Behind
              </button>
              <button
                className={`btn ${settings.completionMetric === 'overdue' ? 'active' : 'btn-outline'}`}
                onClick={() => handleCompletionMetricChange('overdue')}
              >
                Overdue Lessons
              </button>
            </div>
          </div>
        )}

        {/* LiveLesson Default Subject */}
        <div className="settings-section">
          <h3 className="settings-section-title">LiveLesson Default Subject</h3>
          <select 
            className="form-input"
            value={settings.liveLessonSubject || 'None'}
            onChange={(e) => handleSubjectChange(e.target.value)}
          >
            <option value="None">None</option>
            <option value="Math">Math</option>
            <option value="Language Arts">Language Arts</option>
            <option value="Science">Science</option>
            <option value="Behavior">Behavior</option>
            <option value="Social Studies">Social Studies</option>
            <option value="Other Course">Other Course</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;