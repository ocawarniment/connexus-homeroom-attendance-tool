import { useState, useCallback, useEffect } from 'react';

export const useExtensionData = () => {
  const [chatData, setChatData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for storage changes to keep data in sync
  useEffect(() => {
    const handleStorageChange = (changes) => {
      if (changes.chatLedger || changes.userSettings || changes.students || changes.currentApproval || changes.sectionName) {
        refreshData();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get data from Chrome storage
      const result = await chrome.storage.local.get(null);
      
      // Set up crypto password for decryption
      if (result.chatLedger && result.chatLedger.cryptoPass) {
        window.cryptoPass = result.chatLedger.cryptoPass;
      }
      
      // Ensure we have valid data structures
      const newChatData = {
        students: result.students || {},
        userSettings: result.userSettings || {},
        chatLedger: result.chatLedger || {},
        currentApproval: result.currentApproval || {},
        sectionName: result.sectionName || null
      };
      
      setChatData(newChatData);
    } catch (error) {
      console.error('Error loading extension data:', error);
      // Set empty data on error to prevent crashes
      setChatData({
        students: {},
        userSettings: {},
        chatLedger: {},
        currentApproval: {},
        sectionName: null
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadSection = useCallback(async (sectionId, startDate, endDate) => {
    try {
      // Update current approval settings
      const currentApproval = { sectionId, startDate, endDate };
      await chrome.storage.local.set({ currentApproval });
      
      // Send message to background script
      if (sectionId === 'DEBUG') {
        chrome.runtime.sendMessage({ type: 'getDebugRoster' });
      } else {
        chrome.runtime.sendMessage({ type: 'getRoster', sectionId });
      }
      
      // Store last sync timestamp
      const userSettings = chatData?.userSettings || {};
      userSettings.lastSync = new Date().toString();
      await chrome.storage.local.set({ userSettings });
      
      // Refresh data
      await refreshData();
      
      return true;
    } catch (error) {
      console.error('Error downloading section:', error);
      return false;
    }
  }, [chatData, refreshData]);

  const approveAttendance = useCallback((studentId, studentInfo) => {
    const currentApproval = chatData?.currentApproval;
    if (!currentApproval) return;

    const { startDate, endDate } = currentApproval;
    const school = chatData?.userSettings?.school;
    
    let extraInfo = '';
    if (school === 'oca') {
      if (studentInfo.cte !== 'false') {
        extraInfo += '&cte=auto';
      }
      if (studentInfo.ccp !== 'false') {
        extraInfo += '&ccp=auto';
      }
    }
    
    const url = `https://www.connexus.com/webuser/activity/activity.aspx?idWebuser=${studentId}&startDate=${startDate}&endDate=${endDate}${extraInfo}`;
    chrome.tabs.create({ url, active: true });
  }, [chatData]);

  const updateSettings = useCallback(async (newSettings) => {
    try {
      const currentSettings = chatData?.userSettings || {};
      const updatedSettings = { ...currentSettings, ...newSettings };
      
      await chrome.storage.local.set({ userSettings: updatedSettings });
      
      // Update local state
      setChatData(prev => ({
        ...prev,
        userSettings: updatedSettings
      }));
      
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  }, [chatData]);

  return {
    chatData,
    loading,
    downloadSection,
    approveAttendance,
    updateSettings,
    refreshData
  };
};