# Chrome Extension Manifest V2 to V3 Migration Report

## Project Overview
This Chrome extension is a browser automation tool called "CHAT - Connexus Homeroom Attendance Tool" that simulates clicking and scraping data from the Connexus educational platform. The extension helps teachers manage student attendance and track educational progress.

## Current Status Analysis
**IMPORTANT DISCOVERY**: The manifest.json is already set to version 3, but the code still contains many V2 patterns that need migration.

**Current Configuration:**
- **Manifest Version**: 3 (already updated)
- **Service Worker**: Already configured as `"service_worker": "background.js"`
- **Action API**: Already using `"action"` instead of `"browser_action"`
- **Content Scripts**: Multiple content scripts for Connexus pages and Zoom
- **Permissions**: webNavigation, downloads, storage, tabs, windows, <all_urls>
- **CSP**: Already updated to V3 format: `"script-src 'self'; object-src 'self';"`

## Critical V2 Code Patterns Requiring Migration

### 1. Missing Scripting Permission
**Issue:** Manifest lacks "scripting" permission required for V3 scripting API
**Impact:** Critical - Dynamic script injection will fail

**Current Permissions:**
```json
"permissions": [
    "webNavigation", "downloads", "storage", "tabs", "windows", "<all_urls>"
]
```

**Solution:** Add "scripting" permission and move `<all_urls>` to `host_permissions`

### 2. jQuery Dependencies in Background Context
**Issue:** Background script uses jQuery for AJAX requests but service workers have limited context
**Impact:** High - Core functionality affected

**Locations:**
- `background.js` lines 421, 468 - `$.getJSON()` calls
- `js/services/versioning.js` lines 6, 24 - `$.getJSON()` calls

**Examples:**
```javascript
$.getJSON(githubUrl, data => { 
    chrome.storage.local.get(null, result => {
        chrome.storage.local.set({chatLedger: data});
    })
})
```

**Solution:** Replace with native `fetch()` API

### 3. Tabs.executeScript → Scripting API
**Critical Issue:** Extensive use of `chrome.tabs.executeScript()` throughout the codebase

**Locations Found:**
- `background.js`: 25+ instances across multiple message handlers
- Used for injecting content scripts dynamically
- Used for executing inline code snippets  
- Used with frameId for iframe targeting
- Used in functions: getRoster, getTruancyDetails, scrapeValue, getWork, saveWork, createLog, sendWebmail, getCatTime, loadCatTime, loadCAT, cteccpAdjust, cteccpCheck, cteccpSave, cteccpAlertResults, activityLogOpenAndSave, activityLogOpen, loglivelesson, updateWorkCounts

**Examples:**
```javascript
chrome.tabs.executeScript(tab.id, {
    file: '/js/connexus/sections/getRoster.js',
    runAt: 'document_end'
});

chrome.tabs.executeScript(tab.id, {
    code: 'const cssSelector="${request.cssSelector}";',
    runAt: 'document_end'
});

chrome.tabs.executeScript(sender.tab.id, {
    frameId: catFrameId,
    file: "js/connexus/cat/activityTracker/getCatTime.js"
});
```

**Solution:** Replace with `chrome.scripting.executeScript()`

### 4. Deprecated Tab Properties
**Issue:** Use of deprecated `selected` property in `chrome.tabs.create()` and `chrome.tabs.update()`
**Impact:** Medium - Tabs may not focus properly

**Locations Found:**
- `background.js`: 15+ instances in functions like getRoster, getTruancyDetails, checkAssessments, createLog, sendWebmail, activityLogOpenAndSave, activityLogOpen, loglivelesson, attendanceChangeCancel, focusOnAL, updateWorkCounts
- `popup.js`: 1 instance in approveAttendance function

**Examples:**
```javascript
chrome.tabs.create({ url: url, selected: true}, function(tab) {});
chrome.tabs.update(tabId, {selected: true});
```

**Solution:** Replace `selected` with `active`

### 5. Host Permissions Structure
**Issue:** `<all_urls>` should be moved to `host_permissions` in V3
**Impact:** Medium - May cause permission issues

**Current Structure:**
```json
"permissions": ["webNavigation", "downloads", "storage", "tabs", "windows", "<all_urls>"]
```

**Solution:** Move `<all_urls>` to separate `host_permissions` array

### 6. Chrome API Usage Patterns
**Storage API:** ✅ Compatible (no changes needed)
**Runtime API:** ✅ Compatible (no changes needed)  
**Tabs API:** ⚠️ Mostly compatible (executeScript and selected property need migration)
**WebNavigation API:** ✅ Compatible (no changes needed)
**Windows API:** ✅ Compatible (no changes needed)
**Scripting API:** ❌ Missing - needs to be added for V3 compatibility

## Files Requiring Modification

### High Priority (Core Functionality)
1. **manifest.json** - Complete manifest migration
2. **background.js** - Convert to service worker, remove jQuery, update executeScript calls
3. **popup.js** - Update any V2-specific API calls
4. **All content scripts** - Update chrome.runtime.sendMessage patterns if needed

### Medium Priority (Feature-Specific)
1. **js/connexus/cat/activityView.js** - Update chrome API calls
2. **js/services/waitAndScrape.js** - Review for compatibility
3. **js/background/loadWork.js** - Update chrome API calls
4. **js/background/storeWork.js** - Update chrome API calls

## Migration Strategy

### Phase 1: Critical Fixes (High Priority)
1. **Add scripting permission** to manifest.json
2. **Move host permissions** from permissions to host_permissions array
3. **Replace jQuery AJAX calls** with fetch() API in background.js and versioning.js
4. **Update chrome.tabs.executeScript()** calls to chrome.scripting.executeScript()
5. **Fix deprecated selected property** usage in tabs API calls

### Phase 2: Code Quality Improvements (Medium Priority)  
1. **Bundle jQuery locally** if still needed for popup functionality
2. **Review CSP settings** for any additional restrictions needed
3. **Update error handling** patterns for better debugging

### Phase 3: Testing and Validation (Essential)
1. **Test section roster downloading** functionality
2. **Verify student data scraping** from Connexus dataviews
3. **Test attendance approval workflows** 
4. **Validate live lesson logging** features
5. **Check webmail automation** functionality
6. **Test CAT (Connexus Activity Tracker)** integration
7. **Verify iframe targeting** with frameId still works

## Potential Challenges

### 1. jQuery in Background Context
- jQuery is loaded in background script but service workers have limited DOM access
- Need to refactor or remove jQuery usage from background context

### 2. Dynamic Script Injection
- Heavy reliance on executeScript for dynamic functionality
- Need to migrate to chrome.scripting.executeScript with proper permissions

### 3. Frame Targeting
- Extension uses frameId for targeting iframes
- Need to ensure scripting API supports frame targeting

### 4. Inline Code Execution
- Multiple instances of inline code execution via executeScript
- May need to convert to separate script files for V3 compliance

## Migration Status
- [x] Manifest V3 format (already done)
- [x] Service worker configuration (already done)
- [x] Action API (already done)
- [x] CSP V3 format (already done)
- [x] Add scripting permission (completed)
- [x] Move host permissions (completed)
- [x] Replace jQuery AJAX with fetch() (completed)
- [x] Migrate chrome.tabs.executeScript() calls (completed)
- [x] Fix deprecated selected property (completed)
- [x] Add notifications permission (completed)
- [x] Replace window.alert with notifications API (completed)
- [ ] Testing and validation

## Migration Progress Update
- **Critical V2 Dependencies**: ✅ COMPLETED
- **Service Worker Compatibility**: ✅ COMPLETED  
- **Chrome API Modernization**: ✅ COMPLETED
- **Remaining Work**: Testing and validation only

## Completed Migrations
1. ✅ All `chrome.tabs.executeScript()` calls migrated to `chrome.scripting.executeScript()`
2. ✅ All deprecated `selected` properties changed to `active`
3. ✅ jQuery AJAX calls replaced with fetch() API
4. ✅ Service worker `window.alert()` calls replaced with notifications API
5. ✅ Permissions updated for V3 compatibility
6. ✅ Host permissions properly structured

**Current Status**: 95% Complete - Ready for testing

## Notes
This extension has complex automation functionality that heavily depends on dynamic script injection. The migration will require careful testing to ensure all features continue to work correctly in the V3 environment.