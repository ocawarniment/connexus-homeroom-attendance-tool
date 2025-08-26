# Chrome Extension Manifest V2 to V3 Migration Tasks

## Project Overview
**Extension Name:** CHAT - Connexus Homeroom Attendance Tool  
**Purpose:** Browser automation tool for Connexus educational platform data scraping and attendance management  
**Current Status:** Partially migrated - manifest is V3 but code contains V2 patterns

## Critical Migration Tasks (High Priority)

### Task 1: Complete chrome.tabs.executeScript Migration
**Status:** ✅ COMPLETED  
**Priority:** CRITICAL  
**Files Affected:** `background.js`  
**Issue:** All instances of deprecated `chrome.tabs.executeScript()` migrated

**Locations:**
1. `background.js:481` - getTruancy function
2. `background.js:575` - updateWorkCounts function

**Migration Required:**
```javascript
// OLD V2 Pattern
chrome.tabs.executeScript(tab.id, {
    file: '/js/connexus/dataview/getTruancy.js',
    runAt: 'document_end'
});

// NEW V3 Pattern
chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['/js/connexus/dataview/getTruancy.js']
});
```

**Complexity:** LOW  
**Estimated Time:** 30 minutes

---

### Task 2: Fix Deprecated 'selected' Property Usage
**Status:** ✅ COMPLETED  
**Priority:** HIGH  
**Files Affected:** `background.js`, `popup.js`

**Locations:**
1. `background.js:479` - getTruancy function
2. `background.js:565` - focusOnAL function  
3. `background.js:574` - updateWorkCounts function
4. `popup.js:276` - approveAttendance function

**Migration Required:**
```javascript
// OLD V2 Pattern
chrome.tabs.create({ url: url, selected: true }, callback);
chrome.tabs.update(tabId, { selected: true });

// NEW V3 Pattern  
chrome.tabs.create({ url: url, active: true }, callback);
chrome.tabs.update(tabId, { active: true });
```

**Complexity:** LOW  
**Estimated Time:** 15 minutes

---

### Task 3: Service Worker Context Issues - window.alert Usage
**Status:** ✅ COMPLETED  
**Priority:** HIGH  
**Files Affected:** `background.js`, `js/services/versioning.js`

**Issue:** Service workers cannot use `window.alert()` - will cause runtime errors

**Locations:**
1. `background.js:76` - Section download completion alert
2. `background.js:399` - Activity log completion alert  
3. `js/services/versioning.js:15,17,25` - Update notifications

**Alternative Solutions:**
1. **Option A:** Use chrome.notifications API
2. **Option B:** Send messages to content scripts to show alerts
3. **Option C:** Use chrome.action.setBadgeText for status updates

**Recommended Solution:** Chrome notifications API
```javascript
// Replace window.alert() with:
chrome.notifications.create({
    type: 'basic',
    iconUrl: '/images/icon.png',
    title: 'CHAT Extension',
    message: 'Section download complete!'
});
```

**Additional Permission Required:** `"notifications"`

**Complexity:** MEDIUM  
**Estimated Time:** 2 hours

---

## Medium Priority Tasks

### Task 4: Modernize Callback-Based API Usage
**Status:** ❌ NOT STARTED  
**Priority:** MEDIUM  
**Files Affected:** Multiple files

**Issue:** Extensive use of callback-based Chrome APIs instead of Promise-based

**Locations:** 20+ instances across:
- `background.js` - Storage and tabs API calls
- `popup.js` - Storage API calls
- Content scripts - Runtime messaging

**Migration Example:**
```javascript
// OLD Callback Pattern
chrome.storage.local.get(null, function(result) {
    // handle result
});

// NEW Promise Pattern (Optional but recommended)
const result = await chrome.storage.local.get(null);
// handle result
```

**Complexity:** MEDIUM  
**Estimated Time:** 4 hours

---

### Task 5: Content Script jQuery Dependencies
**Status:** ✅ IDENTIFIED  
**Priority:** MEDIUM  
**Files Affected:** `popup.html`, content scripts

**Issue:** jQuery loaded from local file but may have compatibility issues

**Current Usage:**
- `popup.html:22` - jQuery loaded for popup functionality
- Bootstrap components depend on jQuery
- Some content scripts may expect jQuery availability

**Alternative Solutions:**
1. **Option A:** Keep jQuery for popup only (current approach)
2. **Option B:** Replace jQuery with vanilla JavaScript
3. **Option C:** Use modern framework (React/Vue) - major refactor

**Recommended Solution:** Keep current jQuery usage for popup, ensure no service worker usage

**Complexity:** LOW (current approach) / HIGH (full replacement)  
**Estimated Time:** 1 hour (verification) / 20+ hours (full replacement)

---

## Low Priority Tasks

### Task 6: Content Script Alert Modernization (Optional)
**Status:** ❌ NOT STARTED  
**Priority:** LOW  
**Files Affected:** Content scripts in `js/connexus/` directory

**Issue:** Content scripts still use `alert()` and `window.alert()` calls

**Current Usage:** 15+ instances across:
- `js/connexus/sections/getRoster.js` - Connection and error alerts
- `js/connexus/log/createLog.js` - No changes alert
- `js/connexus/webmail/sendWebmail.js` - Connection and warning alerts
- `js/connexus/dataview/getTruancy.js` - Data view error alert
- `js/connexus/myStudents/getOverdue.js` - Permission and completion alerts
- `js/connexus/log/logLiveLesson.js` - LiveLesson status alerts
- `js/connexus/cat/activityView.js` - Debug alerts (commented out)

**Note:** These alerts work fine in content script context, but could be improved for better UX

**Alternative Solutions:**
1. **Keep current alerts** (Recommended) - Works fine, familiar UX
2. **Custom modal system** - Better UX but requires significant work
3. **Toast notifications** - Modern approach but requires UI framework

**Complexity:** LOW (keep current) / HIGH (modernize)  
**Estimated Time:** 0 hours (keep current) / 12+ hours (modernize)

---

### Task 7: Error Handling Improvements
**Status:** ❌ NOT STARTED  
**Priority:** LOW  
**Files Affected:** All JavaScript files

**Issue:** Limited error handling in async operations and Chrome API calls

**Improvements Needed:**
- Add try-catch blocks around Chrome API calls
- Implement proper error logging
- Add user-friendly error messages
- Handle network failures gracefully

**Complexity:** MEDIUM  
**Estimated Time:** 6 hours

---

### Task 8: Content Security Policy Optimization
**Status:** ✅ COMPLETE  
**Priority:** LOW  
**Current CSP:** `"script-src 'self'; object-src 'self';"`

**Status:** Already properly configured for V3

---

## Difficult Migration Challenges & Alternative Solutions

### Challenge 1: Service Worker Limitations with DOM APIs
**Issue:** Service workers cannot access DOM APIs like `window.alert()`

**Alternative Solutions:**
1. **Chrome Notifications API** (Recommended)
   - Add `"notifications"` permission
   - Replace all `window.alert()` calls
   - Provides better UX with persistent notifications

2. **Message Passing to Content Scripts**
   - Send messages from service worker to content scripts
   - Content scripts can show alerts/modals
   - More complex but maintains current UX

3. **Action Badge Updates**
   - Use `chrome.action.setBadgeText()` for status updates
   - Less intrusive than alerts
   - Good for background status updates

### Challenge 2: Complex Frame Targeting
**Issue:** Extension heavily uses frameId for iframe targeting

**Current Status:** ✅ SUCCESSFULLY MIGRATED  
**Solution Used:** `chrome.scripting.executeScript()` with `frameIds` parameter

**Verification Needed:** Test iframe targeting functionality thoroughly

### Challenge 3: Dynamic Code Injection Patterns
**Issue:** Extension injects variables into frames before executing scripts

**Current Status:** ✅ SUCCESSFULLY MIGRATED  
**Solution Used:** Function injection with arguments parameter

**Example Migration:**
```javascript
// OLD V2 Pattern
chrome.tabs.executeScript(tabId, {
    code: 'var callback = "' + request.callback + '";'
});
chrome.tabs.executeScript(tabId, {
    file: 'script.js'
});

// NEW V3 Pattern
chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (callback) => { window.callback = callback; },
    args: [request.callback]
}).then(() => {
    return chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['script.js']
    });
});
```

---

## Testing Requirements

### Critical Functionality Tests

#### 1. Extension Installation & Permissions
- [ ] Extension installs without errors
- [ ] All required permissions are granted
- [ ] Service worker starts correctly
- [ ] Popup opens and displays correctly
- [ ] Notifications permission is requested and works

#### 2. Section Roster Download (getRoster)
- [ ] Can enter section ID and download roster
- [ ] Student data is properly encrypted and stored
- [ ] Progress notifications appear correctly
- [ ] Error handling works for invalid section IDs
- [ ] Content script injection works on Connexus pages

#### 3. Student Data Scraping (getTruancy)
- [ ] Truancy data is collected for all students
- [ ] Data view pages load and scrape correctly
- [ ] Background tabs are created and closed properly
- [ ] Student metrics are calculated correctly
- [ ] Error handling for inaccessible data views

#### 4. Attendance Approval Workflows
- [ ] Activity log pages open correctly
- [ ] Attendance can be approved for students
- [ ] CTE/CCP student handling works
- [ ] Manual and automatic approval modes work
- [ ] Frame targeting for CAT integration works

#### 5. Live Lesson Logging (Zoom Integration)
- [ ] Zoom report pages are detected
- [ ] Student attendance data is extracted
- [ ] Log entries are created correctly
- [ ] Subject selection works properly
- [ ] Missing student alerts appear

#### 6. Webmail Automation
- [ ] Webmail composition pages open
- [ ] Email templates are populated
- [ ] Student and caretaker addressing works
- [ ] Warning alerts appear appropriately

#### 7. CAT (Connexus Activity Tracker) Integration
- [ ] Frame targeting works for CAT iframes
- [ ] Time data is extracted correctly
- [ ] CTE/CCP hour adjustments work
- [ ] Activity log modifications work
- [ ] Save operations complete successfully

#### 8. Service Worker Functionality
- [ ] Background script starts and runs without errors
- [ ] Message passing between contexts works
- [ ] Chrome API calls execute successfully
- [ ] Notifications appear instead of alerts
- [ ] Storage operations work correctly

#### 9. Content Script Functionality
- [ ] Content scripts inject on correct pages
- [ ] Page manipulation works correctly
- [ ] Data extraction functions properly
- [ ] Communication with background works
- [ ] Error handling in content scripts

### Browser Compatibility
- [ ] Test in Chrome (primary target)
- [ ] Test in Edge (Chromium-based)
- [ ] Verify all permissions work correctly
- [ ] Test on different screen sizes
- [ ] Test with different user permission levels

### Performance Tests
- [ ] Extension doesn't slow down browser
- [ ] Memory usage is reasonable
- [ ] Background script doesn't consume excessive resources
- [ ] Page load times aren't significantly impacted

### Error Scenario Tests
- [ ] Network connectivity issues
- [ ] Invalid section IDs
- [ ] Missing permissions
- [ ] Connexus site changes/errors
- [ ] Zoom site changes/errors
- [ ] Service worker restart scenarios

---

## Migration Timeline

### Phase 1: Critical Fixes (Day 1)
- [x] Complete executeScript migration (30 min) ✅ COMPLETED
- [x] Fix selected property usage (15 min) ✅ COMPLETED
- [x] Implement notifications API (2 hours) ✅ COMPLETED
- [x] Add notifications permission (5 min) ✅ COMPLETED

### Phase 2: Testing & Validation (Current Phase)
- [ ] Test section roster download functionality
- [ ] Test student data scraping (getTruancy)
- [ ] Test attendance approval workflows
- [ ] Test live lesson logging features
- [ ] Test webmail automation
- [ ] Test CAT integration features
- [ ] Verify iframe targeting works correctly
- [ ] Test notifications appear correctly
- [ ] Test error scenarios and edge cases
- [ ] User acceptance testing

### Phase 3: Optional Improvements (Day 3)
- [ ] Modernize callback APIs
- [ ] Improve error handling
- [ ] Code cleanup and optimization

**Total Estimated Time:** 2-3 days

---

## Risk Assessment

### High Risk Items
1. **Service Worker Context Changes** - May break existing functionality
2. **Frame Targeting** - Complex iframe interactions may fail
3. **Notification Permissions** - Users may deny notification access

### Mitigation Strategies
1. Thorough testing in development environment
2. Gradual rollout to test users
3. Fallback mechanisms for notification failures
4. Comprehensive error logging

---

## Testing Results & Issues Found

### Critical Issues (Must Fix)
*To be filled during testing phase*

### Minor Issues (Should Fix)
*To be filled during testing phase*

### Enhancement Opportunities (Could Fix)
*To be filled during testing phase*

---

## Success Criteria
- [x] All Chrome V2 APIs successfully migrated to V3 ✅
- [x] Service worker context compatibility achieved ✅
- [ ] No runtime errors in service worker context (Testing needed)
- [ ] All automation features work correctly (Testing needed)
- [ ] User experience remains consistent (Testing needed)
- [ ] Extension passes Chrome Web Store review (Testing needed)
- [ ] Performance is maintained or improved (Testing needed)

---

## Notes
- Manifest is already V3 format ✅
- Service worker configuration complete ✅
- Most executeScript calls already migrated ✅
- Host permissions properly configured ✅
- CSP properly configured for V3 ✅

**Current Migration Status:** 95% Complete - All Critical V2 Dependencies Resolved ✅

## Next Steps
1. **Immediate:** Begin comprehensive testing of all functionality
2. **Priority:** Fix any critical issues found during testing
3. **Optional:** Consider modernizing callback-based APIs (Task 4)
4. **Optional:** Improve error handling (Task 7)
5. **Future:** Consider modernizing content script alerts (Task 6)

## Ready for Production Testing
The extension has been successfully migrated from Manifest V2 to V3 with all critical dependencies resolved:
- ✅ Service worker implementation complete
- ✅ Chrome scripting API migration complete  
- ✅ Deprecated API usage eliminated
- ✅ Notifications system implemented
- ✅ Permissions properly configured

**Remaining Work:** Comprehensive testing and bug fixes only