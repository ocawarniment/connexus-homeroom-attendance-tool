// Initialize chatLedger variable for service worker
let chatLedger = null;
let activeSectionDownload = null;
const activityDataWorkers = new Map();
const activityWorkerGroups = new Map();
const activityWorkerGroupLocks = new Map();
const activityWorkerStartLocks = new Map();
const chatGroupAnimations = new Map();
const ACTIVITY_DATA_STEP_TIMEOUT_MS = 20000;
const activityWorkerStorage = chrome.storage.session || chrome.storage.local;
let activityWorkerPersistence = Promise.resolve();
let activityWorkerRecovery = Promise.resolve();
const SECTION_DOWNLOAD_WORKER_KEY = 'activeSectionDownloadWorker';
let sectionDownloadRecovery = Promise.resolve();

function activityDataFailureMessage(step) {
    return step === 'work'
        ? 'Unable to display lesson and assessment counts.'
        : 'Unable to overwrite Course Activity with specific course name.';
}

function stopChatGroupAnimation(groupId) {
    const animation = chatGroupAnimations.get(groupId);
    if (!animation) return;
    clearInterval(animation.intervalId);
    chatGroupAnimations.delete(groupId);
}

function startChatGroupAnimation(groupId) {
    if (chatGroupAnimations.has(groupId)) return;
    let dotCount = -1;
    const updateTitle = async () => {
        dotCount = (dotCount + 1) % 4;
        try {
            await chrome.tabGroups.update(groupId, { title: `CHAT — Downloading${'.'.repeat(dotCount)}`, collapsed: true });
        } catch (error) {
            // The group disappears automatically once its final worker tab closes.
            stopChatGroupAnimation(groupId);
        }
    };
    const intervalId = setInterval(updateTitle, 700);
    chatGroupAnimations.set(groupId, { intervalId });
    updateTitle();
}
chrome.storage.local.get(null, result => {
    chatLedger = materializeLedgerAliases(result.chatLedger);
    if (chatLedger !== result.chatLedger) chrome.storage.local.set({ chatLedger });
})

// Ledger aliases let schools share an identical configuration without creating
// separate copies that can drift. Storage always receives the complete object.
function materializeLedgerAliases(ledger) {
    if (!ledger || typeof ledger !== 'object') return ledger;
    const aliases = Object.entries(ledger).filter(([, value]) => value?.copyFrom);
    if (!aliases.length) return ledger;

    const expandedLedger = { ...ledger };
    aliases.forEach(([school, alias]) => {
        const source = ledger[alias.copyFrom];
        if (!source) {
            console.warn(`CHAT Ledger alias "${school}" references missing school "${alias.copyFrom}".`);
            return;
        }
        const { copyFrom, ...overrides } = alias;
        expandedLedger[school] = { ...JSON.parse(JSON.stringify(source)), ...overrides, name: school };
    });
    return expandedLedger;
}

function sendActivityProgress(tabId, step, status, message) {
    console.info(`[CHAT activity data] ${step}: ${status}`, { sourceTabId: tabId, message });
    if (!tabId) return;
    chrome.tabs.sendMessage(tabId, { type: 'activityDataProgress', step, status, message }).catch(() => {});
}

function serializeActivityDataWorkers() {
    const workers = {};
    for (const [sourceTabId, steps] of activityDataWorkers.entries()) {
        workers[sourceTabId] = {};
        for (const [step, details] of Object.entries(steps)) {
            workers[sourceTabId][step] = { windowId: details.windowId, tabId: details.tabId, groupId: details.groupId };
        }
    }
    return workers;
}

function persistActivityDataWorkers() {
    const snapshot = serializeActivityDataWorkers();
    activityWorkerPersistence = activityWorkerPersistence
        .catch(() => {})
        .then(() => activityWorkerStorage.set({ activityDataWorkers: snapshot }))
        .catch(error => console.error('[CHAT activity data] Could not persist worker registry.', error));
    return activityWorkerPersistence;
}

async function recoverActivityDataWorkers() {
    try {
        const { activityDataWorkers: savedWorkers = {} } = await activityWorkerStorage.get('activityDataWorkers');
        await activityWorkerStorage.remove('activityDataWorkers');
        for (const [sourceTabId, steps] of Object.entries(savedWorkers)) {
            for (const [step, details] of Object.entries(steps)) {
                if (details.tabId) {
                    try { await chrome.tabs.remove(details.tabId); } catch (error) {}
                } else if (details.windowId) {
                    // Compatibility cleanup for worker windows created before tab groups were introduced.
                    try { await chrome.windows.remove(details.windowId); } catch (error) {}
                }
                sendActivityProgress(Number(sourceTabId), step, 'error', activityDataFailureMessage(step));
                console.warn('[CHAT activity data] Closed worker left by a previous service-worker session.', { sourceTabId, step, windowId: details.windowId });
            }
        }
    } catch (error) {
        console.error('[CHAT activity data] Could not recover prior worker windows.', error);
    }
}

async function addActivityWorkerToChatGroup(sourceTabId, workerTabId, windowId) {
    const priorTask = activityWorkerGroupLocks.get(sourceTabId) || Promise.resolve();
    const task = priorTask.catch(() => {}).then(async () => {
        const existingGroup = activityWorkerGroups.get(sourceTabId);
        const groupId = existingGroup
            ? await chrome.tabs.group({ tabIds: workerTabId, groupId: existingGroup.groupId })
            : await chrome.tabs.group({ tabIds: workerTabId, createProperties: { windowId } });
        await chrome.tabGroups.update(groupId, { title: 'CHAT', color: 'purple', collapsed: true });
        activityWorkerGroups.set(sourceTabId, { groupId, windowId });
        startChatGroupAnimation(groupId);
        return groupId;
    });
    activityWorkerGroupLocks.set(sourceTabId, task);
    try {
        return await task;
    } finally {
        if (activityWorkerGroupLocks.get(sourceTabId) === task) activityWorkerGroupLocks.delete(sourceTabId);
    }
}

async function waitForTabLoad(tabId, timeoutMs = 30000, signal) {
    console.info('[CHAT activity data] Waiting for worker tab to load.', { tabId, timeoutMs });
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === 'complete') {
        console.info('[CHAT activity data] Worker tab was already loaded.', { tabId });
        return;
    }
    await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            chrome.tabs.onUpdated.removeListener(onUpdated);
            signal?.removeEventListener('abort', onAbort);
            callback(value);
        };
        const timeout = setTimeout(() => {
            console.error('[CHAT activity data] Worker tab timed out while loading.', { tabId, timeoutMs });
            finish(reject, new Error('Background data workspace did not finish loading.'));
        }, timeoutMs);
        const onUpdated = (updatedTabId, changeInfo) => {
            if (updatedTabId !== tabId || changeInfo.status !== 'complete') return;
            console.info('[CHAT activity data] Worker tab finished loading.', { tabId });
            finish(resolve);
        };
        const onAbort = () => finish(reject, new Error('Background data workspace was closed.'));
        chrome.tabs.onUpdated.addListener(onUpdated);
        if (signal?.aborted) onAbort();
        else signal?.addEventListener('abort', onAbort, { once: true });
    });
}

async function createActivityDataWorker(sourceTabId, step, url, scriptFile) {
    await activityWorkerRecovery;
    if (!sourceTabId) throw new Error('The source activity page is unavailable.');
    const existingWorker = activityDataWorkers.get(sourceTabId)?.[step];
    if (existingWorker) {
        console.warn('[CHAT activity data] Replacing duplicate worker request.', { sourceTabId, step, windowId: existingWorker.windowId });
        await closeActivityDataWorker(sourceTabId, step, { notify: false });
    }
    sendActivityProgress(sourceTabId, step, 'loading');
    console.info('[CHAT activity data] Opening collapsed CHAT-group worker.', { sourceTabId, step, url, scriptFile });
    let workerTab;
    let sourceWindowId;
    try {
        const sourceTab = await chrome.tabs.get(sourceTabId);
        sourceWindowId = sourceTab.windowId;
        workerTab = await chrome.tabs.create({ windowId: sourceWindowId, url, active: false });
    } catch (error) {
        throw new Error(`Unable to create the background data workspace: ${error.message}`);
    }
    if (!workerTab?.id) {
        throw new Error('Unable to create the background data workspace.');
    }
    let groupId;
    try {
        groupId = await addActivityWorkerToChatGroup(sourceTabId, workerTab.id, sourceWindowId);
    } catch (error) {
        try { await chrome.tabs.remove(workerTab.id); } catch (removeError) {}
        throw new Error(`Unable to place the background data workspace in the CHAT tab group: ${error.message}`);
    }
    console.info('[CHAT activity data] CHAT-group worker created.', { sourceTabId, step, windowId: sourceWindowId, groupId, tabId: workerTab.id });

    const existing = activityDataWorkers.get(sourceTabId) || {};
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
        console.error('[CHAT activity data] Worker exceeded its step deadline.', { sourceTabId, step, timeoutMs: ACTIVITY_DATA_STEP_TIMEOUT_MS });
        finishActivityDataWorker(sourceTabId, step, 'error', activityDataFailureMessage(step)).catch(error => console.error('[CHAT activity data] Timed-out worker cleanup failed.', error));
    }, ACTIVITY_DATA_STEP_TIMEOUT_MS);
    activityDataWorkers.set(sourceTabId, { ...existing, [step]: { windowId: sourceWindowId, tabId: workerTab.id, groupId, timeoutId, abortController } });
    await persistActivityDataWorkers();
    await waitForTabLoad(workerTab.id, 30000, abortController.signal);
    if (scriptFile) {
        console.info('[CHAT activity data] Injecting worker script.', { sourceTabId, step, tabId: workerTab.id, scriptFile });
        await chrome.scripting.executeScript({ target: { tabId: workerTab.id }, files: [scriptFile] });
    }
    return workerTab;
}

function startActivityDataWorker(sourceTabId, step, url, scriptFile) {
    const key = `${sourceTabId}:${step}`;
    const priorTask = activityWorkerStartLocks.get(key) || Promise.resolve();
    const task = priorTask.catch(() => {}).then(() => createActivityDataWorker(sourceTabId, step, url, scriptFile));
    activityWorkerStartLocks.set(key, task);
    return task.finally(() => {
        if (activityWorkerStartLocks.get(key) === task) activityWorkerStartLocks.delete(key);
    });
}

function findActivityWorkerByTab(tabId) {
    for (const [sourceTabId, worker] of activityDataWorkers.entries()) {
        for (const [step, details] of Object.entries(worker)) {
            if (details?.tabId === tabId) return { sourceTabId, step, details };
        }
    }
    return null;
}

function findActivityWorkerByWindow(windowId) {
    for (const [sourceTabId, worker] of activityDataWorkers.entries()) {
        for (const [step, details] of Object.entries(worker)) {
            if (details?.windowId === windowId) return { sourceTabId, step, details };
        }
    }
    return null;
}

async function closeActivityDataWorker(sourceTabId, step, { status, message, notify = true } = {}) {
    const worker = activityDataWorkers.get(sourceTabId);
    const details = worker?.[step];
    if (notify && status) sendActivityProgress(sourceTabId, step, status, message);
    if (!details) return;
    clearTimeout(details.timeoutId);
    details.abortController?.abort();
    const remaining = { ...worker };
    delete remaining[step];
    if (Object.keys(remaining).length) activityDataWorkers.set(sourceTabId, remaining);
    else {
        activityDataWorkers.delete(sourceTabId);
        stopChatGroupAnimation(details.groupId);
        activityWorkerGroups.delete(sourceTabId);
    }
    await persistActivityDataWorkers();
    try {
        await chrome.tabs.remove(details.tabId);
        console.info('[CHAT activity data] CHAT-group worker closed.', { sourceTabId, step, tabId: details.tabId, groupId: details.groupId });
    } catch (error) { console.warn('[CHAT activity data] Background data workspace was already closed.', { sourceTabId, step, error: error.message }); }
}

function finishActivityDataWorker(sourceTabId, step, status = 'complete', message) {
    return closeActivityDataWorker(sourceTabId, step, { status, message });
}

async function closeAllActivityDataWorkers(sourceTabId, message) {
    const worker = activityDataWorkers.get(sourceTabId);
    if (!worker) return;
    await Promise.all(Object.keys(worker).map(step => finishActivityDataWorker(sourceTabId, step, 'error', message || activityDataFailureMessage(step))));
}

activityWorkerRecovery = recoverActivityDataWorkers();

chrome.tabs.onRemoved.addListener(tabId => {
    if (activityDataWorkers.has(tabId)) {
        closeAllActivityDataWorkers(tabId, 'The activity page was closed before the data download finished.').catch(error => console.error('[CHAT activity data] Source-tab cleanup failed.', error));
        return;
    }
    const worker = findActivityWorkerByTab(tabId);
    if (worker) finishActivityDataWorker(worker.sourceTabId, worker.step, 'error', activityDataFailureMessage(worker.step)).catch(error => console.error('[CHAT activity data] Worker-tab cleanup failed.', error));
});

chrome.windows.onRemoved.addListener(windowId => {
    const worker = findActivityWorkerByWindow(windowId);
    if (worker) finishActivityDataWorker(worker.sourceTabId, worker.step, 'error', activityDataFailureMessage(worker.step)).catch(error => console.error('[CHAT activity data] Worker-window cleanup failed.', error));
    if (activeSectionDownload?.windowId === windowId) finishSectionDownload('error', 'The CHAT download group was closed before the download finished.').catch(error => console.error('Section-download window cleanup failed.', error));
});

chrome.tabGroups.onRemoved.addListener(group => stopChatGroupAnimation(group.id));

chrome.runtime.onInstalled.addListener(function(details){
    if(details.reason == "install"){
        // initial setup
        initInstall();
    }else if(details.reason == "update"){
        //call a function to handle an update
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // log all messages not already logged
    request.type !== 'log' ? console.log('message request: ',request) : false;

    // bgConsole.log()
    if(request.type == 'log') {
        console.log(request.value);
    }

    // Open sidepanel
    if(request.type == 'openSidePanel') {
        chrome.sidePanel.open({ tabId: sender.tab.id });
    }

    // init user settings if theyre not set somehow
    if(request.type == 'initUserSettings') {
        initUserSettings();
    }

    // sections w/o overdue lessons for non hr teachers
    if (request.type == "getDebugRoster") {
        setDebugStudents();
    };

    // sections w/o overdue lessons for non hr teachers
    if (request.type == "getRoster") {
        startSectionDownload(request.sectionId, sender.tab?.windowId)
            .then(() => sendResponse({ started: true }))
            .catch(async error => {
                console.error('Unable to start section download:', error);
                if (activeSectionDownload) await finishSectionDownload('error', 'Unable to start the section download.');
                else await updateDownloadProgress({ status: 'error', message: 'Unable to start the section download.' });
                sendResponse({ started: false, error: error.message });
            });
        return true;
    }

    if (request.type === 'rosterScrapeComplete') {
        startTruancyDownload().catch(error => finishSectionDownload('error', error.message));
    }

    if (request.type === 'truancyScrapeComplete' && activeSectionDownload) {
        completeCurrentStudent(request).catch(error => finishSectionDownload('error', error.message));
    }

    if (request.type === 'sectionDownloadError' && activeSectionDownload) {
        finishSectionDownload('error', request.message || 'The section could not be downloaded.');
    }

    if (request.type === 'cancelSectionDownload') {
        finishSectionDownload('cancelled', 'Download stopped. You can restart it at any time.')
            .then(() => sendResponse({ cancelled: true }));
        return true;
    }

    // CAT Cleanup Messages
    if (request.type == "scrapeValue") {
        (async () => {
            const sourceTabId = sender.tab?.id;
            const step = 'prerequisite';
            let tabId;
            try {
                const workerTab = request.hidden
                    ? await startActivityDataWorker(sourceTabId, step, request.url)
                    : await chrome.tabs.create({ url: request.url, active: false });
                tabId = workerTab?.id;
                if (!tabId) throw new Error('Unable to create the data scrape workspace.');
                await waitForTabLoad(tabId);
                await chrome.scripting.executeScript({
                    target: { tabId },
                    func: (cssSelector) => { window.cssSelector = cssSelector; },
                    args: [request.cssSelector]
                });
                const result = await chrome.scripting.executeScript({ target: { tabId }, files: ['js/services/waitAndScrape.js'] });
                sendResponse(result[0].result);
            } catch (error) {
                console.error('[CHAT activity data] Prerequisite value scrape failed.', { url: request.url, tabId, error: error.message, stack: error.stack });
                sendResponse(null);
            } finally {
                if (request.hidden && sourceTabId) {
                    await closeActivityDataWorker(sourceTabId, step, { notify: false });
                } else if (tabId) {
                    try { await chrome.tabs.remove(tabId); } catch (error) {}
                }
            }
        })();
        return true; // keep connection open for async repionse
    } 

    if (request.type == "getWork") {
        const sourceTabId = sender.tab?.id;
        chrome.storage.local.get(null, function (result) {
            startActivityDataWorker(
                sourceTabId,
                'work',
                'https://www.connexus.com/webuser/dataview.aspx?idWebuser=' + result.studentID + '&idDataview=410',
                'js/connexus/dataview/getWork.js'
            ).catch(error => {
                console.error('[CHAT activity data] Lesson and assessment worker failed.', error, { sourceTabId });
                finishActivityDataWorker(sourceTabId, 'work', 'error', activityDataFailureMessage('work'));
            });
        });
    }

    if (request.type == "reloadWork") {
        function checkLoad() {
            chrome.storage.local.get(null, function(result) {
                setTimeout(function() {
                    if(result.workReload == false) {
                        chrome.scripting.executeScript({
                            target: { tabId: sender.tab.id },
                            func: () => {
                                if(document.getElementsByClassName("cxAlert cxAlertVisible").length == 1){
                                    chrome.runtime.sendMessage({type: "saveWork"});
                                }
                            }
                        });
                        if(loopCount<=15) {
                            loopCount = loopCount + 1;
                            checkLoad();
                        }
                    }
                }, 1000);
            });
        }
        loopCount=0;
        chrome.storage.local.set({'workReload': false});
        checkLoad();
    }
    
    if (request.type == "saveWork") {
        chrome.storage.local.set({"workReload": true});
        // Keep the hidden worker open until its values have been copied back to the activity page.
        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            files: ['js/background/storeWork.js']
        });
    }

    if (request.type == "closeWorkDVs") {
        closeWorkDVs();
        focusOnAL();
    };
    
    if (request.type == "updateWork") {
        const activityWorker = findActivityWorkerByTab(sender.tab?.id);
        const sourceTabId = activityWorker?.sourceTabId;
        chrome.storage.local.get('actLogID', function(result) {
            const activityTabId = sourceTabId || result.actLogID;
            if (!activityTabId) return;
            updateWorkCounts(activityTabId)
                .then(() => finishActivityDataWorker(activityTabId, 'work'))
                .catch(error => {
                    console.error('[CHAT activity data] Lesson and assessment handoff failed.', error, { activityTabId });
                    finishActivityDataWorker(activityTabId, 'work', 'error', activityDataFailureMessage('work'));
                });
        });
    };

    if (request.type == "checkAssessments") {
        chrome.tabs.create({url: "https://www.connexus.com/assessments/results/listTaken.aspx?idWebuser="+request.studentID, active: true}, function(tab) {} );
    }

    if(request.type == "openPage"){
        if (request.hidden) {
            startActivityDataWorker(sender.tab?.id, 'course', request.url)
                .catch(error => {
                    console.error('[CHAT activity data] Course activity worker failed.', error, { sourceTabId: sender.tab?.id });
                    finishActivityDataWorker(sender.tab?.id, 'course', 'error', activityDataFailureMessage('course'));
                });
        } else {
            chrome.tabs.create({ url: request.url, active: request.focused }, function(tab) {
                // Do Nothin
            });
        }
        if(request.closeSender){
            chrome.tabs.remove(sender.tab.id);
        }
    }

    // automate comms and documentation
    if (request.type == "createLog") {
        chrome.storage.local.get(null, function(result){
            // convert the adjustments to less characters
            let adjString = result.timeAdjustments.map(entry => {
                // Regex to extract date, sign, hours, and minutes
                let match = entry.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}).*?([+-])(\d+).*?(\d+)/);
                
                if (match) {
                    let month = match[1].padStart(2, '0');
                    let day = match[2].padStart(2, '0');
                    let year = match[3].slice(-2);
                    let sign = match[4];
                    let hours = match[5].padStart(2, '0');
                    let minutes = match[6].padStart(2, '0');
                
                    return `${month}${day}${year}${sign}${hours}h${minutes}m`;
                }
            }).join(';');
            adjString += ';';

            // get the approval window details - comment.innerHTML = "Attendance Adjustments \n" + result.globalStartDate + " - " + result.globalEndDate + "\n\n" + result.studentLessons + "\n" + result.studentAssessments + "\n\n" + changesText;
            let appWindow = `${result.globalStartDate}-${result.globalEndDate}`;
            let workNumbers = `L${result.studentLessons.match(/\d+/)[0]}|A${result.studentAssessments.match(/\d+/)[0]}`

            chrome.tabs.create({ url: 'https://www.connexus.com/log/logEntry.aspx?idWebuser=' + request.studentID + '&sendto=%2flog%2fdefault.aspx%3fidWebuser%3d' + request.studentID + '&sectionId=' + result.currentApproval.sectionId + '&adjStr=' + adjString + '&appWindow=' + appWindow + '&workNumbers=' + workNumbers, active: true}, function(tab) {
                // execute the download homeroom external script on the new tab
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['js/connexus/log/createLog.js'],
                    world: 'MAIN'
                });
            });
        });
    };
    if (request.type == "sendWebmail") {
        chrome.storage.local.get(null, function(result) {	
            chrome.storage.local.set({globalStartDate: request.startDate, globalEndDate: request.endDate});
            chrome.tabs.create({ url: 'https://www.connexus.com/webmail?hideHeader=true/#/composemessage?idWebuser=' + request.studentID + '&includeStudent=true&includeCaretakers=true&subject=Attendance Adjustments: ' + request.startDate + " - " + request.endDate, active: true}, function(tab) {
                // execute the download homeroom external script on the new tab
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['js/connexus/webmail/sendWebmail.js']
                });
            });
        });
    };

    // get course names from CAT weekView
    if (request.type == "getCatTime") {
        chrome.webNavigation.getAllFrames({tabId:sender.tab.id},function(frames){
            // find the correct frame
            frames.forEach(frame => {
                if(frame.url !== sender.tab.url) {
                    catFrameId = frame.frameId;
                }
            })
            // call the function on the the inner frame
            chrome.scripting.executeScript({
                target: { tabId: sender.tab.id, frameIds: [catFrameId] },
                files: ["js/connexus/cat/activityTracker/getCatTime.js"]
            }).then(function(results){
                // handle results
            });
        });
    }

    if (request.type == 'loadCatTime'){
		const activityWorker = findActivityWorkerByTab(sender.tab?.id);
		const sourceTabId = activityWorker?.sourceTabId;
			// check that the originally id is still stored
			chrome.storage.local.get(null, function(result) {
                console.log('attempting to load cat time course activity', result);
				const activityTabId = sourceTabId || result.actLogID;
				chrome.tabs.update(activityTabId, {active: false});
				chrome.scripting.executeScript({
					target: { tabId: activityTabId },
					files: ['/js/connexus/cat/activityLog/loadCatTime.js']
                }).then(() => finishActivityDataWorker(activityTabId, 'course'))
				  .catch(error => {
					  console.error('[CHAT activity data] Course activity handoff failed.', error, { activityTabId });
					  finishActivityDataWorker(activityTabId, 'course', 'error', activityDataFailureMessage('course'));
				  });
			});
		}

    if (request.type == "loadCAT") {
        chrome.webNavigation.getAllFrames({tabId:sender.tab.id},function(frames){
            var catFrameId = frames[1].frameId;
            chrome.scripting.executeScript({
                target: { tabId: sender.tab.id, frameIds: [catFrameId] },
                files: ["js/connexus/cat/activityTracker/getTime.js"]
            }).then(function(results){
                //Handle any results
            });
        });
    }

    if (request.type == "cteccpAdjust") {
        console.log(request);
        chrome.webNavigation.getAllFrames({tabId:sender.tab.id},function(frames){
            // find the correct frame
            frames.forEach(frame => {
                if(frame.url !== sender.tab.url) {
                    catFrameId = frame.frameId;
                }
            })
            // store variables to the inner frame
            console.log(frames);
            chrome.scripting.executeScript({
                target: { tabId: sender.tab.id, frameIds: [catFrameId] },
                func: (callback, dailyHours, adjType, baseQuery) => {
                    window.callback = callback;
                    window.dailyHours = dailyHours;
                    window.adjType = adjType;
                    window.baseQuery = baseQuery;
                },
                args: [request.callback, request.dailyHours, request.adjType, request.baseQuery]
            }).then(() => {
                // call the function on the the inner frame
                return chrome.scripting.executeScript({
                    target: { tabId: sender.tab.id, frameIds: [catFrameId] },
                    files: ["js/connexus/cat/activityTracker/cteccpAdjust.js"]
                });
            }).then(function(results){
                //Handle any results
            });
        });
    }

    if (request.type == "cteccpCheck") {
        console.log(request);
        chrome.webNavigation.getAllFrames({tabId:sender.tab.id},function(frames){
            // find the correct frame
            frames.forEach(frame => {
                if(frame.url !== sender.tab.url) {
                    catFrameId = frame.frameId;
                }
            })
            // store variables to the inner frame
            console.log(frames);
            chrome.scripting.executeScript({
                target: { tabId: sender.tab.id, frameIds: [catFrameId] },
                func: (approve, dailyHours, adjType, baseQuery) => {
                    window.approve = approve;
                    window.dailyHours = dailyHours;
                    window.adjType = adjType;
                    window.baseQuery = baseQuery;
                },
                args: [request.approve, request.dailyHours, request.adjType, request.baseQuery]
            }).then(() => {
                // call the function on the the inner frame
                return chrome.scripting.executeScript({
                    target: { tabId: sender.tab.id, frameIds: [catFrameId] },
                    files: ["js/connexus/cat/activityTracker/cteccpCheck.js"]
                });
            }).then(function(results){
                // handle results
            });
        });
    }

    if (request.type == "cteccpSave") {
        console.log('trying to save...');
        chrome.webNavigation.getAllFrames({tabId:sender.tab.id},function(frames){
            // find the correct frame
            frames.forEach(frame => {
                console.log(frame);
                if(frame.url == sender.tab.url) {
                    parentFrameId = frame.frameId;
                }
            })
            // send to the outter frame
            chrome.scripting.executeScript({
                target: { tabId: sender.tab.id, allFrames: true },
                func: () => {
                    document.querySelector('.cxPrimaryBtn').click();
                }
            }).then(function(results){
                //Handle any results
            });
        });
    }

    if (request.type == "cteccpAlertResults") {
        console.log('cteccpStatus: ' + request.correct);
		const activityWorker = findActivityWorkerByTab(sender.tab?.id);
		const sourceTabId = activityWorker?.sourceTabId;
        chrome.storage.local.get(null, (results)=>{
            var correct = request.correct;
			const activityTabId = sourceTabId || results.actLogID;
            if(correct == false) {
                const tabId = activityTabId;
                chrome.tabs.update(tabId, {active: false});
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['js/connexus/cat/activityLog/cteccpInitiateChange.js']
                });
            } else {
                const tabId = activityTabId;
                chrome.tabs.update(tabId, {active: false});
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['js/connexus/cat/activityLog/cteccpConfirmTime.js']
                });
            }
			finishActivityDataWorker(activityTabId, 'course');
        })
    }

    if (request.type == "activityLogOpenAndSave") {
        // create the tab with the student id
        setTimeout(()=>{
            chrome.tabs.create({ url: 'https://www.connexus.com/webuser/activity/activity.aspx' + request.attendanceParams, active: true }, function(tab) {
                // execute the get work script on the opened tab
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        var btnApprove = document.querySelector("#btnApprove");
                        btnApprove.onclick = ()=>{
                            WebForm_DoPostBackWithOptions(new WebForm_PostBackOptions("btnApprove", "", true, "approve", "", false, true));
                        };
                        btnApprove.click();
                    }
                });
            });
            // close the sender
            chrome.tabs.remove(sender.tab.id, ()=>{} );
        },2000);
    }
    
    if (request.type == "activityLogOpen") {
        // create the tab with the student id
        setTimeout(()=>{
            chrome.tabs.create({ url: 'https://www.connexus.com/webuser/activity/activity.aspx' + request.attendanceParams, active: true }, function(tab) {
                var changes = request.changes;
                var changesString = changes.join(",");
                console.log(changesString);
                // execute the get work script on the opened tab
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        // Use chrome.runtime.sendMessage to notify background
                        chrome.runtime.sendMessage({
                            type: 'showNotification',
                            title: 'CHAT Extension',
                            message: 'Changes complete!'
                        });
                    }
                });
            });
            // close the sender
            chrome.tabs.remove(sender.tab.id, ()=>{} );
        },2000);
    }

    if(request.type == 'updateStudentAttribute') {
        chrome.storage.local.get(null, result => {
            let students = result.students;
            students[`ST${request.studentId}`][request.attribute] = request.newValue;
            chrome.storage.local.set({'students': students});
        })
    }

    // log live lesson
    if(request.type == 'loglivelesson') {
        chrome.tabs.create({ url: `${request.logUrl}`, active: true }, function(tab) {
            // execute the get work script on the opened tab
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['/js/connexus/log/logLiveLesson.js']
            });
        });
        // open the log section page
        //send message to background with students name array to open log tab and log students
        //
        // loop and select the students
        // provide results alert; highlight those that were missed
    }

    // refresh chatLedger from github
    if(request.type == 'updateChatLedger') {
        (async()=>{
            updateChatLedger();
        })();
    }

    // Show notification (for content script requests)
    if (request.type == "showNotification") {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: '/images/icon.png',
            title: request.title || 'CHAT Extension',
            message: request.message
        });
    }

    ////// Store any tab ID in storage to reference later
    if (request.type == "storeTabID") {
        chrome.storage.local.set({[request.tabTitle]: sender.tab.id});
    };
    if (request.type == "reloadTab") {
        chrome.tabs.reload(sender.tab.id);
    };
    if (request.type == "attendanceChangeCancel") {
        tabURL = sender.tab.url;
        chrome.tabs.remove(sender.tab.id, function() { });
        chrome.tabs.create({url: tabURL, active: true}, function(tab) {} );
        
    };
})

function updateChatLedger(){
    var timestamp = new Date();
    // github url - updated to use refs/heads/master
    let githubUrl = "https://raw.githubusercontent.com/ocawarniment/ocawarniment.github.io/refs/heads/master/chatLedger.json" + "?timestamp=" + timestamp.toString();
    // get from github using fetch API
    fetch(githubUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // data is chatLedger
            chrome.storage.local.get(null, result => {
                let currentVersion = result.chatLedger?.version || 'unknown';
                let newVersion = data.version || 'unknown';
                
                chrome.storage.local.set({chatLedger: materializeLedgerAliases(data)});
                
                // Show notification about the update
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: '/images/icon.png',
                    title: 'CHAT Ledger Updated',
                    message: `Updated from version ${currentVersion} to ${newVersion}`
                });
                
                console.log(`CHAT Ledger updated from ${currentVersion} to ${newVersion}`);
            });
        })
        .catch(error => {
            console.error('Error updating chat ledger:', error);
            chrome.notifications.create({
                type: 'basic',
                iconUrl: '/images/icon.png',
                title: 'CHAT Ledger Update Failed',
                message: 'Failed to update CHAT Ledger. Please check your internet connection.'
            });
        });
}

function updateDownloadProgress(progress) {
    return chrome.storage.local.set({
        downloadProgress: {
            updatedAt: Date.now(),
            ...progress
        }
    });
}

function persistSectionDownloadWorker() {
    const worker = activeSectionDownload
        ? { windowId: activeSectionDownload.windowId, tabId: activeSectionDownload.tabId, groupId: activeSectionDownload.groupId }
        : null;
    return activityWorkerStorage.set({ [SECTION_DOWNLOAD_WORKER_KEY]: worker });
}

async function recoverSectionDownloadWorker() {
    try {
        const saved = await activityWorkerStorage.get(SECTION_DOWNLOAD_WORKER_KEY);
        const worker = saved[SECTION_DOWNLOAD_WORKER_KEY];
        await activityWorkerStorage.remove(SECTION_DOWNLOAD_WORKER_KEY);
        if (!worker?.windowId) return;
        if (worker.tabId) {
            try { await chrome.tabs.remove(worker.tabId); } catch (error) {}
        } else if (worker.windowId) {
            // Compatibility cleanup for worker windows created before tab groups were introduced.
            try { await chrome.windows.remove(worker.windowId); } catch (error) {}
        }
        await updateDownloadProgress({ status: 'error', message: 'A previous hidden section download was stopped safely. Please restart the download.' });
        console.warn('Closed section-download worker left by a previous service-worker session.', worker);
    } catch (error) {
        console.error('Could not recover a prior section-download worker.', error);
    }
}

async function startSectionDownload(sectionId, preferredWindowId) {
    await sectionDownloadRecovery;
    if (activeSectionDownload) {
        await finishSectionDownload('cancelled', 'A new section download was started.');
    }

    await updateDownloadProgress({
        status: 'preparing',
        completed: 0,
        total: 0,
        message: 'Opening the secure download workspace…'
    });

    let workerTab;
    let windowId = preferredWindowId;
    try {
        if (!windowId) windowId = (await chrome.windows.getLastFocused()).id;
        const hostWindow = await chrome.windows.get(windowId);
        if (hostWindow.type !== 'normal') windowId = (await chrome.windows.getLastFocused()).id;
        workerTab = await chrome.tabs.create({
            windowId,
            url: `https://www.connexus.com/lmu/sections/webusers.aspx?idSection=${encodeURIComponent(sectionId)}`,
            active: false
        });
    } catch (error) {
        throw new Error(`Unable to create the section download workspace: ${error.message}`);
    }
    if (!workerTab?.id) {
        throw new Error('Unable to create the section download workspace.');
    }
    let groupId;
    try {
        groupId = await chrome.tabs.group({ tabIds: workerTab.id, createProperties: { windowId } });
        await chrome.tabGroups.update(groupId, { title: 'CHAT', color: 'purple', collapsed: true });
        startChatGroupAnimation(groupId);
    } catch (error) {
        try { await chrome.tabs.remove(workerTab.id); } catch (removeError) {}
        throw new Error(`Unable to place the section download workspace in the CHAT tab group: ${error.message}`);
    }
    activeSectionDownload = {
        windowId,
        tabId: workerTab.id,
        groupId,
        studentIds: [],
        currentIndex: 0
    };
    await persistSectionDownloadWorker();
    console.info('CHAT section-download group created.', { windowId, groupId, tabId: workerTab.id });

    await updateDownloadProgress({
        status: 'roster',
        completed: 0,
        total: 0,
        message: 'Reading the section roster…'
    });
    await chrome.scripting.executeScript({
        target: { tabId: workerTab.id },
        files: ['/js/connexus/sections/getRoster.js']
    });
}

async function startTruancyDownload() {
    if (!activeSectionDownload) return;
    const { students = {}, userSettings = {} } = await chrome.storage.local.get(['students', 'userSettings']);
    activeSectionDownload.studentIds = Object.keys(students);
    activeSectionDownload.currentIndex = 0;

    if (!activeSectionDownload.studentIds.length) {
        await finishSectionDownload('complete', 'No active students were found in this section.');
        return;
    }

    await updateDownloadProgress({
        status: 'downloading',
        completed: 0,
        total: activeSectionDownload.studentIds.length,
        message: `Downloading 0 of ${activeSectionDownload.studentIds.length} student records…`
    });
    await loadNextStudent();
}

async function loadNextStudent() {
    if (!activeSectionDownload) return;
    const { studentIds, currentIndex, tabId } = activeSectionDownload;
    if (currentIndex >= studentIds.length) {
        await finishSectionDownload('complete', 'Section download complete.');
        return;
    }

    const studentId = studentIds[currentIndex];
    const { students = {}, chatLedger: ledger, userSettings = {} } = await chrome.storage.local.get(['students', 'chatLedger', 'userSettings']);
    const dataViewId = ledger?.[userSettings.school]?.truancyDataView?.id;
    const student = students[studentId];
    if (!student || !dataViewId) throw new Error('The student data-view configuration is unavailable.');

    activeSectionDownload.loadAbortController?.abort();
    const loadAbortController = new AbortController();
    activeSectionDownload.loadAbortController = loadAbortController;
    const pageLoaded = waitForTabComplete(tabId, 30000, loadAbortController.signal);
    await chrome.tabs.update(tabId, {
        url: `https://www.connexus.com/dataview/${dataViewId}?idWebuser=${encodeURIComponent(student.id)}`,
        active: false
    });
    await pageLoaded;
    scheduleStudentTimeout(studentId);
    await chrome.scripting.executeScript({
        target: { tabId },
        files: ['/js/connexus/dataview/getTruancy.js']
    });
}

function scheduleStudentTimeout(studentId) {
    if (!activeSectionDownload) return;
    clearTimeout(activeSectionDownload.studentTimeout);
    activeSectionDownload.studentTimeout = setTimeout(() => {
        if (activeSectionDownload?.studentIds[activeSectionDownload.currentIndex] === studentId) {
            finishSectionDownload('error', `Student ${activeSectionDownload.currentIndex + 1} did not respond in time. Check Connexus access, then retry the download.`);
        }
    }, 45000);
}

function waitForTabComplete(tabId, timeout = 30000, signal) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            chrome.tabs.onUpdated.removeListener(listener);
            signal?.removeEventListener('abort', onAbort);
            callback(value);
        };
        const timer = setTimeout(() => {
            finish(reject, new Error('Timed out waiting for Connexus to load.'));
        }, timeout);
        const listener = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                finish(resolve);
            }
        };
        const onAbort = () => finish(reject, new Error('Section download workspace was closed.'));
        chrome.tabs.onUpdated.addListener(listener);
        if (signal?.aborted) onAbort();
        else signal?.addEventListener('abort', onAbort, { once: true });
    });
}

async function completeCurrentStudent(request) {
    if (!activeSectionDownload) return;
    const expectedId = activeSectionDownload.studentIds[activeSectionDownload.currentIndex];
    if (request.studentId !== expectedId) return;
    clearTimeout(activeSectionDownload.studentTimeout);

    const { students = {} } = await chrome.storage.local.get('students');
    if (students[request.studentId] && request.student) {
        students[request.studentId] = { ...students[request.studentId], ...request.student, dataDownloaded: true };
        await chrome.storage.local.set({ students });
    }

    activeSectionDownload.currentIndex += 1;
    const { currentIndex, studentIds } = activeSectionDownload;
    await updateDownloadProgress({
        status: 'downloading',
        completed: currentIndex,
        total: studentIds.length,
        message: `Downloading ${currentIndex} of ${studentIds.length} student records…`
    });
    await loadNextStudent();
}

async function finishSectionDownload(status, message) {
    const download = activeSectionDownload;
    activeSectionDownload = null;
    clearTimeout(download?.studentTimeout);
    download?.loadAbortController?.abort();
    await persistSectionDownloadWorker();
    if (download?.tabId) {
        try {
            await chrome.tabs.remove(download.tabId);
            console.info('CHAT section-download group worker closed.', { groupId: download.groupId, tabId: download.tabId });
        } catch (error) { console.warn('Download workspace was already closed.', error); }
    }
    stopChatGroupAnimation(download?.groupId);
    const { downloadProgress = {} } = await chrome.storage.local.get('downloadProgress');
    await updateDownloadProgress({ ...downloadProgress, status, message });
    if (status === 'complete') {
        chrome.notifications.create({
            type: 'basic', iconUrl: '/images/icon.png', title: 'CHAT Extension', message
        });
    }
}

sectionDownloadRecovery = recoverSectionDownloadWorker();

function initInstall() {
    try {
        // get newest chatLedger on first install
        updateChatLedger();
    } catch(err) {
        // get chatLedger - LOCAL using fetch API
        fetch("chatLedger.json")
            .then(response => response.json())
            .then(data => {
                chrome.storage.local.set({chatLedger: materializeLedgerAliases(data)});
            })
            .catch(error => {
                console.error('Error loading local chat ledger:', error);
            });
    }
    // settings object
    let userSettings = {
        'popupTableDisplayFields': ['id','name','approveButton', 'netHours', 'lessonsBehind', 'lastLogin', 'gapDate'],
        'approvalWindowWeeks': 1,
        'school': 'oca',
        'channel': 'stable',
        'appearanceMode': 'light',
        'approvalWindowWeeks': 1
    }
    let currentApproval = {
        manualDateMode: false
    }
    // set in storage
    chrome.storage.local.set({
        userSettings: userSettings,
        currentApproval: currentApproval
    });
}

function closeWorkDVs() {
	// close any stragler windows that are on the Assessment and Lesson Data View
	chrome.windows.getAll({populate:true},function(windows){
        console.log(windows);
	  windows.forEach(function(window){
		window.tabs.forEach(function(tab){
            console.log(tab);
			// if the url matches, remove the warning using a message then close the tab
			if (tab.url.match(/https?:\/\/www\.connexus\.com\/dataview\/410.*/g)) {
                try{
                    console.log('DELETEOING');
                    chrome.tabs.remove(tab.id)
                }catch(err){};
                console.log('CLOSED');
			};
		});
	  });
	});
}
// function to focus on the activities log
function focusOnAL() {
	chrome.windows.getAll({populate:true},function(windows){
	  windows.forEach(function(window){
		window.tabs.forEach(function(tab){
			// if the url matches, focus on it
			if (tab.url.match(/https?:\/\/www\.connexus\.com\/webuser\/activity\/activity\.aspx\?idWebuser=.*/g)) {
				//focus on the new activities log
				chrome.tabs.update(tab.id, {active: true});
			};
		});
	  });
	});
}

// function to update work
function updateWorkCounts(activitiesLogID) {
	return chrome.scripting.executeScript({
		target: { tabId: activitiesLogID },
		files: ['js/background/loadWork.js']
	});
}

function setDebugStudents(){
    chrome.storage.local.get(null, result => {
        if(result.userSettings.school == 'oca') {
            let students = {
                "STDEBUG1": {
                    "attendanceMetric":1.5,
                    "ccpHours":0,
                    "ccpStudent":null,
                    "cteHours":0,
                    "cteStudent":null,
                    "firstDay":"8/16/2021",
                    "gapDate":"9/2/2021",
                    "id":"STDEBUG1",
                    "lastContact":"8/17/2021",
                    "lastLogin":"9/3/2021",
                    "lessonTimeAlignment":0,
                    "lessonsBehind":5,
                    "missingHours":0,
                    "name":{"$super":{"$super":{}},"algorithm":{"$super":{"$super":{"$super":{"$super":{},"_minBufferSize":0},"_DEC_XFORM_MODE":2,"_ENC_XFORM_MODE":1,"cfg":{"$super":{}},"ivSize":4,"keySize":4},"blockSize":4,"cfg":{"$super":{"$super":{}},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{}}},"keySize":8},"blockSize":4,"ciphertext":{"sigBytes":16,"words":[1435627805,798266395,1581481782,342087874]},"formatter":{},"iv":{"$super":{"$super":{}},"sigBytes":16,"words":[999289350,-1235031155,1958638403,-285841781]},"key":{"$super":{"$super":{}},"sigBytes":32,"words":[-1396629086,-1639440465,2023034687,1821431114,-256990574,724161210,1798899765,963426174,999289350,-1235031155,1958638403,-285841781]},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{},"salt":{"sigBytes":8,"words":[1715349113,-1528608309]}},
                    "netHours":125,
                    "stateId":"SQ4280145",
                    "totalApproved":83.84,
                    "totalRequired":77
                },
                "STDEBUG2": {
                    "attendanceMetric":1.5,
                    "ccpHours":0,
                    "ccpStudent":null,
                    "cteHours":0,
                    "cteStudent":null,
                    "firstDay":"8/16/2021",
                    "gapDate":"9/2/2021",
                    "id":"STDEBUG2",
                    "lastContact":"8/17/2021",
                    "lastLogin":"9/3/2021",
                    "lessonTimeAlignment":0,
                    "lessonsBehind":24,
                    "missingHours":0,
                    "name":{"$super":{"$super":{}},"algorithm":{"$super":{"$super":{"$super":{"$super":{},"_minBufferSize":0},"_DEC_XFORM_MODE":2,"_ENC_XFORM_MODE":1,"cfg":{"$super":{}},"ivSize":4,"keySize":4},"blockSize":4,"cfg":{"$super":{"$super":{}},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{}}},"keySize":8},"blockSize":4,"ciphertext":{"sigBytes":16,"words":[1435627805,798266395,1581481782,342087874]},"formatter":{},"iv":{"$super":{"$super":{}},"sigBytes":16,"words":[999289350,-1235031155,1958638403,-285841781]},"key":{"$super":{"$super":{}},"sigBytes":32,"words":[-1396629086,-1639440465,2023034687,1821431114,-256990574,724161210,1798899765,963426174,999289350,-1235031155,1958638403,-285841781]},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{},"salt":{"sigBytes":8,"words":[1715349113,-1528608309]}},
                    "netHours":50,
                    "stateId":"SQ4280145",
                    "totalApproved":83.84,
                    "totalRequired":77
                },
                "STDEBUG3": {
                    "attendanceMetric":1.5,
                    "ccpHours":0,
                    "ccpStudent":null,
                    "cteHours":0,
                    "cteStudent":null,
                    "firstDay":"8/16/2021",
                    "gapDate":"9/2/2021",
                    "id":"STDEBUG3",
                    "lastContact":"8/17/2021",
                    "lastLogin":"9/3/2021",
                    "lessonTimeAlignment":0,
                    "lessonsBehind":40,
                    "missingHours":0,
                    "name":{"$super":{"$super":{}},"algorithm":{"$super":{"$super":{"$super":{"$super":{},"_minBufferSize":0},"_DEC_XFORM_MODE":2,"_ENC_XFORM_MODE":1,"cfg":{"$super":{}},"ivSize":4,"keySize":4},"blockSize":4,"cfg":{"$super":{"$super":{}},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{}}},"keySize":8},"blockSize":4,"ciphertext":{"sigBytes":16,"words":[1435627805,798266395,1581481782,342087874]},"formatter":{},"iv":{"$super":{"$super":{}},"sigBytes":16,"words":[999289350,-1235031155,1958638403,-285841781]},"key":{"$super":{"$super":{}},"sigBytes":32,"words":[-1396629086,-1639440465,2023034687,1821431114,-256990574,724161210,1798899765,963426174,999289350,-1235031155,1958638403,-285841781]},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{},"salt":{"sigBytes":8,"words":[1715349113,-1528608309]}},
                    "netHours":10,
                    "stateId":"SQ4280145",
                    "totalApproved":83.84,
                    "totalRequired":77
                },
                "STDEBUG4": {
                    "attendanceMetric":1.5,
                    "ccpHours":0,
                    "ccpStudent":null,
                    "cteHours":0,
                    "cteStudent":null,
                    "firstDay":"8/16/2021",
                    "gapDate":"9/2/2021",
                    "id":"STDEBUG4",
                    "lastContact":"8/17/2021",
                    "lastLogin":"9/3/2021",
                    "lessonTimeAlignment":5,
                    "lessonsBehind":35,
                    "missingHours":0,
                    "name":{"$super":{"$super":{}},"algorithm":{"$super":{"$super":{"$super":{"$super":{},"_minBufferSize":0},"_DEC_XFORM_MODE":2,"_ENC_XFORM_MODE":1,"cfg":{"$super":{}},"ivSize":4,"keySize":4},"blockSize":4,"cfg":{"$super":{"$super":{}},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{}}},"keySize":8},"blockSize":4,"ciphertext":{"sigBytes":16,"words":[1435627805,798266395,1581481782,342087874]},"formatter":{},"iv":{"$super":{"$super":{}},"sigBytes":16,"words":[999289350,-1235031155,1958638403,-285841781]},"key":{"$super":{"$super":{}},"sigBytes":32,"words":[-1396629086,-1639440465,2023034687,1821431114,-256990574,724161210,1798899765,963426174,999289350,-1235031155,1958638403,-285841781]},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{},"salt":{"sigBytes":8,"words":[1715349113,-1528608309]}},
                    "netHours":-30,
                    "stateId":"SQ4280145",
                    "totalApproved":83.84,
                    "totalRequired":77
                },
                "STDEBUG5": {
                    "attendanceMetric":1.5,
                    "ccpHours":0,
                    "ccpStudent":null,
                    "cteHours":0,
                    "cteStudent":null,
                    "firstDay":"8/16/2021",
                    "gapDate":"9/2/2021",
                    "id":"STDEBUG5",
                    "lastContact":"8/17/2021",
                    "lastLogin":"9/3/2021",
                    "lessonTimeAlignment":15,
                    "lessonsBehind":25,
                    "missingHours":0,
                    "name":{"$super":{"$super":{}},"algorithm":{"$super":{"$super":{"$super":{"$super":{},"_minBufferSize":0},"_DEC_XFORM_MODE":2,"_ENC_XFORM_MODE":1,"cfg":{"$super":{}},"ivSize":4,"keySize":4},"blockSize":4,"cfg":{"$super":{"$super":{}},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{}}},"keySize":8},"blockSize":4,"ciphertext":{"sigBytes":16,"words":[1435627805,798266395,1581481782,342087874]},"formatter":{},"iv":{"$super":{"$super":{}},"sigBytes":16,"words":[999289350,-1235031155,1958638403,-285841781]},"key":{"$super":{"$super":{}},"sigBytes":32,"words":[-1396629086,-1639440465,2023034687,1821431114,-256990574,724161210,1798899765,963426174,999289350,-1235031155,1958638403,-285841781]},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{},"salt":{"sigBytes":8,"words":[1715349113,-1528608309]}},
                    "netHours":-10,
                    "stateId":"SQ4280145",
                    "totalApproved":83.84,
                    "totalRequired":77
                },
                "STDEBUG6": {
                    "attendanceMetric":1.5,
                    "ccpHours":0,
                    "ccpStudent":null,
                    "cteHours":0,
                    "cteStudent":null,
                    "firstDay":"8/16/2021",
                    "gapDate":"9/2/2021",
                    "id":"STDEBUG6",
                    "lastContact":"8/17/2021",
                    "lastLogin":"9/3/2021",
                    "lessonTimeAlignment":15,
                    "lessonsBehind":5,
                    "missingHours":0,
                    "name":{"$super":{"$super":{}},"algorithm":{"$super":{"$super":{"$super":{"$super":{},"_minBufferSize":0},"_DEC_XFORM_MODE":2,"_ENC_XFORM_MODE":1,"cfg":{"$super":{}},"ivSize":4,"keySize":4},"blockSize":4,"cfg":{"$super":{"$super":{}},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{}}},"keySize":8},"blockSize":4,"ciphertext":{"sigBytes":16,"words":[1435627805,798266395,1581481782,342087874]},"formatter":{},"iv":{"$super":{"$super":{}},"sigBytes":16,"words":[999289350,-1235031155,1958638403,-285841781]},"key":{"$super":{"$super":{}},"sigBytes":32,"words":[-1396629086,-1639440465,2023034687,1821431114,-256990574,724161210,1798899765,963426174,999289350,-1235031155,1958638403,-285841781]},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{},"salt":{"sigBytes":8,"words":[1715349113,-1528608309]}},
                    "netHours":-10,
                    "stateId":"SQ4280145",
                    "totalApproved":83.84,
                    "totalRequired":77
                }
            }
        } else if(['grca', 'ohbca'].includes(result.userSettings.school)){
            let students = {
                "STDEBUG1": {
                    "attendanceMetric":1.5,
                    "ccpHours":0,
                    "ccpStudent":null,
                    "cteHours":0,
                    "cteStudent":null,
                    "firstDay":"8/16/2021",
                    "gapDate":"9/2/2021",
                    "id":"STDEBUG1",
                    "lastContact":"8/17/2021",
                    "lastLogin":"9/3/2021",
                    "lessonTimeAlignment":0,
                    "lessonsBehind":5,
                    "missingHours":0,
                    "name":{"$super":{"$super":{}},"algorithm":{"$super":{"$super":{"$super":{"$super":{},"_minBufferSize":0},"_DEC_XFORM_MODE":2,"_ENC_XFORM_MODE":1,"cfg":{"$super":{}},"ivSize":4,"keySize":4},"blockSize":4,"cfg":{"$super":{"$super":{}},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{}}},"keySize":8},"blockSize":4,"ciphertext":{"sigBytes":16,"words":[1435627805,798266395,1581481782,342087874]},"formatter":{},"iv":{"$super":{"$super":{}},"sigBytes":16,"words":[999289350,-1235031155,1958638403,-285841781]},"key":{"$super":{"$super":{}},"sigBytes":32,"words":[-1396629086,-1639440465,2023034687,1821431114,-256990574,724161210,1798899765,963426174,999289350,-1235031155,1958638403,-285841781]},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{},"salt":{"sigBytes":8,"words":[1715349113,-1528608309]}},
                    "netHours":125,
                    "stateId":"SQ4280145",
                    "totalApproved":83.84,
                    "totalRequired":77
                },
                "STDEBUG2": {
                    "attendanceMetric":1.5,
                    "ccpHours":0,
                    "ccpStudent":null,
                    "cteHours":0,
                    "cteStudent":null,
                    "firstDay":"8/16/2021",
                    "gapDate":"9/2/2021",
                    "id":"STDEBUG2",
                    "lastContact":"8/17/2021",
                    "lastLogin":"9/3/2021",
                    "lessonTimeAlignment":0,
                    "lessonsBehind":24,
                    "missingHours":0,
                    "name":{"$super":{"$super":{}},"algorithm":{"$super":{"$super":{"$super":{"$super":{},"_minBufferSize":0},"_DEC_XFORM_MODE":2,"_ENC_XFORM_MODE":1,"cfg":{"$super":{}},"ivSize":4,"keySize":4},"blockSize":4,"cfg":{"$super":{"$super":{}},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{}}},"keySize":8},"blockSize":4,"ciphertext":{"sigBytes":16,"words":[1435627805,798266395,1581481782,342087874]},"formatter":{},"iv":{"$super":{"$super":{}},"sigBytes":16,"words":[999289350,-1235031155,1958638403,-285841781]},"key":{"$super":{"$super":{}},"sigBytes":32,"words":[-1396629086,-1639440465,2023034687,1821431114,-256990574,724161210,1798899765,963426174,999289350,-1235031155,1958638403,-285841781]},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{},"salt":{"sigBytes":8,"words":[1715349113,-1528608309]}},
                    "netHours":50,
                    "stateId":"SQ4280145",
                    "totalApproved":83.84,
                    "totalRequired":77
                },
                "STDEBUG3": {
                    "attendanceMetric":1.5,
                    "ccpHours":0,
                    "ccpStudent":null,
                    "cteHours":0,
                    "cteStudent":null,
                    "firstDay":"8/16/2021",
                    "gapDate":"9/2/2021",
                    "id":"STDEBUG3",
                    "lastContact":"8/17/2021",
                    "lastLogin":"9/3/2021",
                    "lessonTimeAlignment":0,
                    "lessonsBehind":40,
                    "missingHours":0,
                    "name":{"$super":{"$super":{}},"algorithm":{"$super":{"$super":{"$super":{"$super":{},"_minBufferSize":0},"_DEC_XFORM_MODE":2,"_ENC_XFORM_MODE":1,"cfg":{"$super":{}},"ivSize":4,"keySize":4},"blockSize":4,"cfg":{"$super":{"$super":{}},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{}}},"keySize":8},"blockSize":4,"ciphertext":{"sigBytes":16,"words":[1435627805,798266395,1581481782,342087874]},"formatter":{},"iv":{"$super":{"$super":{}},"sigBytes":16,"words":[999289350,-1235031155,1958638403,-285841781]},"key":{"$super":{"$super":{}},"sigBytes":32,"words":[-1396629086,-1639440465,2023034687,1821431114,-256990574,724161210,1798899765,963426174,999289350,-1235031155,1958638403,-285841781]},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{},"salt":{"sigBytes":8,"words":[1715349113,-1528608309]}},
                    "netHours":10,
                    "stateId":"SQ4280145",
                    "totalApproved":83.84,
                    "totalRequired":77
                },
                "STDEBUG4": {
                    "attendanceMetric":1.5,
                    "ccpHours":0,
                    "ccpStudent":null,
                    "cteHours":0,
                    "cteStudent":null,
                    "firstDay":"8/16/2021",
                    "gapDate":"9/2/2021",
                    "id":"STDEBUG4",
                    "lastContact":"8/17/2021",
                    "lastLogin":"9/3/2021",
                    "lessonTimeAlignment":5,
                    "lessonsBehind":35,
                    "missingHours":0,
                    "name":{"$super":{"$super":{}},"algorithm":{"$super":{"$super":{"$super":{"$super":{},"_minBufferSize":0},"_DEC_XFORM_MODE":2,"_ENC_XFORM_MODE":1,"cfg":{"$super":{}},"ivSize":4,"keySize":4},"blockSize":4,"cfg":{"$super":{"$super":{}},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{}}},"keySize":8},"blockSize":4,"ciphertext":{"sigBytes":16,"words":[1435627805,798266395,1581481782,342087874]},"formatter":{},"iv":{"$super":{"$super":{}},"sigBytes":16,"words":[999289350,-1235031155,1958638403,-285841781]},"key":{"$super":{"$super":{}},"sigBytes":32,"words":[-1396629086,-1639440465,2023034687,1821431114,-256990574,724161210,1798899765,963426174,999289350,-1235031155,1958638403,-285841781]},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{},"salt":{"sigBytes":8,"words":[1715349113,-1528608309]}},
                    "netHours":-30,
                    "stateId":"SQ4280145",
                    "totalApproved":83.84,
                    "totalRequired":77
                },
                "STDEBUG5": {
                    "attendanceMetric":1.5,
                    "ccpHours":0,
                    "ccpStudent":null,
                    "cteHours":0,
                    "cteStudent":null,
                    "firstDay":"8/16/2021",
                    "gapDate":"9/2/2021",
                    "id":"STDEBUG5",
                    "lastContact":"8/17/2021",
                    "lastLogin":"9/3/2021",
                    "lessonTimeAlignment":15,
                    "lessonsBehind":25,
                    "missingHours":0,
                    "name":{"$super":{"$super":{}},"algorithm":{"$super":{"$super":{"$super":{"$super":{},"_minBufferSize":0},"_DEC_XFORM_MODE":2,"_ENC_XFORM_MODE":1,"cfg":{"$super":{}},"ivSize":4,"keySize":4},"blockSize":4,"cfg":{"$super":{"$super":{}},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{}}},"keySize":8},"blockSize":4,"ciphertext":{"sigBytes":16,"words":[1435627805,798266395,1581481782,342087874]},"formatter":{},"iv":{"$super":{"$super":{}},"sigBytes":16,"words":[999289350,-1235031155,1958638403,-285841781]},"key":{"$super":{"$super":{}},"sigBytes":32,"words":[-1396629086,-1639440465,2023034687,1821431114,-256990574,724161210,1798899765,963426174,999289350,-1235031155,1958638403,-285841781]},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{},"salt":{"sigBytes":8,"words":[1715349113,-1528608309]}},
                    "netHours":-10,
                    "stateId":"SQ4280145",
                    "totalApproved":83.84,
                    "totalRequired":77
                },
                "STDEBUG6": {
                    "attendanceMetric":1.5,
                    "ccpHours":0,
                    "ccpStudent":null,
                    "cteHours":0,
                    "cteStudent":null,
                    "firstDay":"8/16/2021",
                    "gapDate":"9/2/2021",
                    "id":"STDEBUG6",
                    "lastContact":"8/17/2021",
                    "lastLogin":"9/3/2021",
                    "lessonTimeAlignment":15,
                    "lessonsBehind":5,
                    "missingHours":0,
                    "name":{"$super":{"$super":{}},"algorithm":{"$super":{"$super":{"$super":{"$super":{},"_minBufferSize":0},"_DEC_XFORM_MODE":2,"_ENC_XFORM_MODE":1,"cfg":{"$super":{}},"ivSize":4,"keySize":4},"blockSize":4,"cfg":{"$super":{"$super":{}},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{}}},"keySize":8},"blockSize":4,"ciphertext":{"sigBytes":16,"words":[1435627805,798266395,1581481782,342087874]},"formatter":{},"iv":{"$super":{"$super":{}},"sigBytes":16,"words":[999289350,-1235031155,1958638403,-285841781]},"key":{"$super":{"$super":{}},"sigBytes":32,"words":[-1396629086,-1639440465,2023034687,1821431114,-256990574,724161210,1798899765,963426174,999289350,-1235031155,1958638403,-285841781]},"mode":{"$super":{"$super":{}},"Decryptor":{"$super":null},"Encryptor":{"$super":null}},"padding":{},"salt":{"sigBytes":8,"words":[1715349113,-1528608309]}},
                    "netHours":-10,
                    "stateId":"SQ4280145",
                    "totalApproved":83.84,
                    "totalRequired":77
                }
            }
        }
        chrome.storage.local.set({students: students});
    })
}
// Set the side panel to open when the extension icon is clicked
chrome.runtime.onStartup.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error('Error setting panel behavior:', error));
});

// Also set on install/update
chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error('Error setting panel behavior:', error));
});

// Handle direct action clicks as fallback
chrome.action.onClicked.addListener(async (tab) => {
    try {
        await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
        console.error('Error opening sidepanel:', error);
    }
});
