import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DownloadSection from './components/DownloadSection';
import StudentTable from './components/StudentTable';
import SettingsPanel from './components/SettingsPanel';
import { useExtensionData } from './hooks/useExtensionData';

const App = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { 
    chatData, 
    loading, 
    downloadSection, 
    approveAttendance,
    updateSettings,
    refreshData 
  } = useExtensionData();

  useEffect(() => {
    // Initialize extension data on mount
    refreshData();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading extension data...
      </div>
    );
  }

  // Handle case where data failed to load
  if (!chatData) {
    return (
      <div className="loading">
        <div>Failed to load extension data. Please try refreshing.</div>
        <button onClick={refreshData} className="btn btn-primary" style={{ marginTop: '10px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div id="root">
      <Header 
        school={chatData?.userSettings?.school}
        onSettingsClick={() => setSettingsOpen(true)}
      />
      
      <div className="main-content">
        <DownloadSection 
          currentApproval={chatData?.currentApproval || {}}
          userSettings={chatData?.userSettings || {}}
          onDownload={downloadSection}
        />
        
        <StudentTable 
          students={chatData?.students || {}}
          userSettings={chatData?.userSettings || {}}
          chatLedger={chatData?.chatLedger || {}}
          onApprove={approveAttendance}
        />
      </div>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userSettings={chatData?.userSettings || {}}
        chatLedger={chatData?.chatLedger || {}}
        onUpdateSettings={updateSettings}
        onRefreshData={refreshData}
      />
    </div>
  );
};

export default App;