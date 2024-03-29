// load into window
chrome.storage.local.get(null, result => {
    window.chatLedger = result.chatLedger;
})

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
        chrome.storage.local.get(null,function(result){
            chrome.tabs.create({ url: 'https://www.connexus.com/lmu/sections/webusers.aspx?idSection=' + request.sectionId, selected: true}, function(tab) {
                // execute the download homeroom external script on the new tab
                chrome.tabs.executeScript(tab.id, {
                    file: '/js/connexus/sections/getRoster.js',
                    runAt: 'document_end'
                });
            });
        });
    };

    // get truancy info for ALL students
    if(request.type == 'getTruancyDetails') {
        (async()=>{
            // all students or single student
            if(request.studentId == 'all') {
                // get the student IDs from the storage.students obj
                chrome.storage.local.get(null, async (result) => {
                    // local store students
                    let students = result.students;
                    // loop through each student and execute the script
                    let studentIds = Object.keys(students);
                    let i=0;
                    do{
                        // runn async 
                        console.log(`loop ${i} for ${studentIds[i]}`);
                        await getTruancy(studentIds[i]);
                        i++;
                    }while( i<studentIds.length );
                    // get overdues if setting AND only for OCA
                    if(result.userSettings.completionMetric == 'overdue' && result.userSettings.school == 'oca') {
                        chrome.tabs.create({ url: 'https://www.connexus.com/sectionsandstudents#/mystudents/' + result.currentApproval.sectionId, selected: true }, function(tab) {
                            // execute the get work script on the opened tab
                            chrome.tabs.executeScript(tab.id, {
                                file: '/js/connexus/myStudents/getOverdue.js',
                                runAt: 'document_end'
                            });
                        });
                    } else {
                        // alert completion
                        window.alert('Section download complete!');
                    }
                })
            }
        })();
    }

    // CAT Cleanup Messages
    if (request.type == "scrapeValue") {
        //getWeaponUsage(request.weaponType).then( (results)=>{ sendResponse({results: results}); } );
        chrome.tabs.create({url: request.url, selected: false},(tab) => {
            chrome.tabs.executeScript(tab.id, {
                code: `const cssSelector="${request.cssSelector}";`,
                runAt: 'document_end'
            });
            chrome.tabs.executeScript(tab.id, {
                file: 'js/services/waitAndScrape.js',
                runAt: 'document_end'
            },(result) => {
                console.log(result);
                sendResponse(result[0]);
                chrome.tabs.remove(tab.id);
            });
        })
        return true; // keep connection open for async repionse
    } 

    if (request.type == "getWork") {
        // close tab id they request
        if (request.closeSender == true) { chrome.tabs.remove(sender.tab.id); }
        // load variables
        chrome.storage.local.get(null, function (result) {
            // create the tab with the student id
            chrome.tabs.create({ url: 'https://www.connexus.com/webuser/dataview.aspx?idWebuser=' + result.studentID + '&idDataview=410', selected: false }, function(tab) {
                // execute the get work script on the opened tab
                chrome.tabs.executeScript(tab.id, {
                    file: 'js/connexus/dataView/getWork.js',
                    runAt: 'document_end'
                });
            });
        });
    }

    if (request.type == "reloadWork") {
        function checkLoad() {
            chrome.storage.local.get(null, function(result) {
                setTimeout(function() {
                    if(result.workReload == false) {
                        chrome.tabs.executeScript(sender.tab.id, {code: 'if(document.getElementsByClassName("cxAlert cxAlertVisible").length == 1){chrome.runtime.sendMessage({type: "saveWork"});}', runAt: 'document_end'});
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
        if (request.closeSender == true) { chrome.tabs.remove(sender.tab.id); }
        // load variables
        chrome.tabs.executeScript(sender.tab.id, {
            file: 'js/background/storeWork.js',
            runAt: 'document_end'
        });
    }

    if (request.type == "closeWorkDVs") {
        closeWorkDVs();
        focusOnAL();
    };
    
    if (request.type == "updateWork") {
        try{
            // check that the originally id is still stored
            console.log('updateWorkCounts')
            chrome.storage.local.get('actLogID', function(result) { updateWorkCounts(result.actLogID); });
            // close out any stragglers
            // close sender
            //chrome.tabs.remove(sender.tab.id);
            closeWorkDVs();
        }catch(err){}
    };

    if (request.type == "checkAssessments") {
        chrome.tabs.create({url: "https://www.connexus.com/assessments/results/listTaken.aspx?idWebuser="+request.studentID, selected: true}, function(tab) {} );
    }

    if(request.type == "openPage"){
        chrome.tabs.create({ url: request.url, selected: request.focused }, function(tab) {
            // Do Nothin
        });
        if(request.closeSender){
            chrome.tabs.remove(sender.tab.id);
        }
    }

    // automate comms and documentation
    if (request.type == "createLog") {
        chrome.tabs.create({ url: 'https://www.connexus.com/log/logEntry.aspx?idWebuser=' + request.studentID + '&sendto=%2flog%2fdefault.aspx%3fidWebuser%3d' + request.studentID, selected: true}, function(tab) {
            // execute the download homeroom external script on the new tab
            chrome.tabs.executeScript(tab.id, {
                file: 'js/connexus/log/createLog.js',
                runAt: 'document_end'
            });
        });
    };
    if (request.type == "sendWebmail") {
        chrome.storage.local.get(null, function(result) {	
            chrome.storage.local.set({globalStartDate: request.startDate, globalEndDate: request.endDate});
            chrome.tabs.create({ url: 'https://www.connexus.com/webmail?hideHeader=true/#/composemessage?idWebuser=' + request.studentID + '&includeStudent=true&includeCaretakers=true&subject=Attendance Adjustments: ' + request.startDate + " - " + request.endDate, selected: true}, function(tab) {
                // execute the download homeroom external script on the new tab
                chrome.tabs.executeScript(tab.id, {
                    file: 'js/connexus/webmail/sendWebmail.js',
                    runAt: 'document_end'
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
            chrome.tabs.executeScript(sender.tab.id,{
                frameId: catFrameId, //allFrames: true,
                file: "js/connexus/cat/activityTracker/getCatTime.js"
            },function(results){
                // handle results
            });
        });
    }

    if (request.type == 'loadCatTime'){
			// check that the originally id is still stored
			chrome.storage.local.get('actLogID', function(result) {
				chrome.tabs.update(result.actLogId, {selected: true});
				chrome.tabs.executeScript(result.actLogId, {
					file: '/js/connexus/cat/activityLog/loadCatTime.js',
					runAt: 'document_idle'
				});
			});
			if (request.closeSender == true) { chrome.tabs.remove(sender.tab.id); }
		}

    if (request.type == "loadCAT") {
        chrome.webNavigation.getAllFrames({tabId:sender.tab.id},function(frames){
            var catFrameId = frames[1].frameId;
            chrome.tabs.executeScript(sender.tab.id,{
                frameId: catFrameId,
                file: "js/connexus/cat/activityTracker/getTime.js"
            },function(results){
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
            chrome.tabs.executeScript(sender.tab.id,{
                frameId: catFrameId,
                code: 'var callback = "' + request.callback + '"; var dailyHours='+request.dailyHours+'; var adjType="'+request.adjType+'"; var baseQuery="'+request.baseQuery+'"'
            }),
            // call the function on the the inner frame
            chrome.tabs.executeScript(sender.tab.id,{
                frameId: catFrameId, //allFrames: true,
                file: "js/connexus/cat/activityTracker/cteccpAdjust.js"
            },function(results){
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
            chrome.tabs.executeScript(sender.tab.id,{
                frameId: catFrameId,
                code: 'var approve = ' + request.approve + '; var dailyHours='+request.dailyHours+'; var adjType="'+request.adjType+'"; var baseQuery="'+request.baseQuery+'"'
            }),
            // call the function on the the inner frame
            chrome.tabs.executeScript(sender.tab.id,{
                frameId: catFrameId, //allFrames: true,
                file: "js/connexus/cat/activityTracker/cteccpCheck.js"
            },function(results){
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
            chrome.tabs.executeScript(sender.tab.id,{
                allFrames: true,
                code: "document.querySelector('.cxPrimaryBtn').click();"
            },function(results){
                //Handle any results
            });
        });
    }

    if (request.type == "cteccpAlertResults") {
        console.log('cteccpStatus: ' + request.correct);
        chrome.storage.local.get(null, (results)=>{
            var correct = request.correct;
            if(correct == false) {
                const tabId = results.actLogID;
                chrome.tabs.update(tabId, {selected: true});
                chrome.tabs.executeScript(tabId, {
                    file: 'js/connexus/cat/activityLog/cteccpInitiateChange.js',
                    runAt: 'document_idle'
                });
            } else {
                const tabId = results.actLogID;
                chrome.tabs.update(tabId, {selected: true});
                chrome.tabs.executeScript(tabId, {
                    file: 'js/connexus/cat/activityLog/cteccpConfirmTime.js',
                    runAt: 'document_idle'
                });
            }
        })
        chrome.tabs.remove(sender.tab.id, ()=>{} );
    }

    if (request.type == "activityLogOpenAndSave") {
        // create the tab with the student id
        setTimeout(()=>{
            chrome.tabs.create({ url: 'https://www.connexus.com/webuser/activity/activity.aspx' + request.attendanceParams, selected: true }, function(tab) {
                // execute the get work script on the opened tab
                chrome.tabs.executeScript(tab.id, {
                    code: 'var btnApprove = document.querySelector("#btnApprove"); btnApprove.onclick = ()=>{WebForm_DoPostBackWithOptions(new WebForm_PostBackOptions("btnApprove", "", true, "approve", "", false, true));}; btnApprove.click();',
                    runAt: 'document_end'
                });
            });
            // close the sender
            chrome.tabs.remove(sender.tab.id, ()=>{} );
        },2000);
    }
    
    if (request.type == "activityLogOpen") {
        // create the tab with the student id
        setTimeout(()=>{
            chrome.tabs.create({ url: 'https://www.connexus.com/webuser/activity/activity.aspx' + request.attendanceParams, selected: true }, function(tab) {
                var changes = request.changes;
                var changesString = changes.join(",");
                console.log(changesString);
                // execute the get work script on the opened tab
                chrome.tabs.executeScript(tab.id, {
                    code: 'window.alert("Changes complete!");',
                    runAt: 'document_end'
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
        chrome.tabs.create({ url: `${request.logUrl}`, selected: true }, function(tab) {
            // execute the get work script on the opened tab
            chrome.tabs.executeScript(tab.id, {
                file: '/js/connexus/log/logLiveLesson.js',
                runAt: 'document_end'
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
        chrome.tabs.create({url: tabURL, selected: true}, function(tab) {} );
        
    };
})

function updateChatLedger(){
    var timestamp = new Date();
    // github url
    let githubUrl = "https://raw.githubusercontent.com/ocawarniment/ocawarniment.github.io/master/chatLedger.json" + "?timestamp=" + timestamp.toString();
    // get from github
    $.getJSON(githubUrl, data => { 
        // data is chatLedger
        chrome.storage.local.get(null, result => {
            chrome.storage.local.set({chatLedger: data});
        })
    })
}

async function getTruancy(studentId){
    return new Promise((studentResolve, reject) => {
        chrome.storage.local.get(null,  (result) => {
            let students = result.students;
            let student = students[studentId];
            let dvUrl = 'https://www.connexus.com/dataview/' + result.chatLedger[result.userSettings.school].truancyDataView.id + '?idWebuser=' + student.id;
            console.log(dvUrl);
            chrome.tabs.create({ url: dvUrl, selected: false}, (tab) => {
                // execute the get truancy values script at the document end
                chrome.tabs.executeScript(tab.id, {
                    file: '/js/connexus/dataview/getTruancy.js',
                    runAt: 'document_end'
                }, async emptyPromise => {
    
                    // Create a promise that resolves when chrome.runtime.onMessage fires
                    const message = new Promise(resolve => {
                        const listener = request => {
                            chrome.runtime.onMessage.removeListener(listener);
                            resolve(request);
                        };
                        chrome.runtime.onMessage.addListener(listener);
                    });
            
                    const result = await message;
                    //console.log(result); // Logs true
                    studentResolve(result);
                });
            });
        })
    })
}


function initInstall() {
    try {
        // get newest chatLedger on first install
        updateChatLedger();
    } catch(err) {
        // get chatLedger - LOCAL
        $.getJSON("chatLedger.json", (data) => { chrome.storage.local.set({chatLedger: data}) });
    }
    // settings object
    let userSettings = {
        'popupTableDisplayFields': ['id','name','approveButton', 'netHours', 'lessonsBehind', 'lastLogin', 'gapDate'],
        'approvalWindowWeeks': 1,
        'school': 'oca',
        'channel': 'stable',
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
				chrome.tabs.update(tab.id, {selected: true});
			};
		});
	  });
	});
}

// function to update work
function updateWorkCounts(activitiesLogID) {
	chrome.tabs.update(activitiesLogID, {selected: true});
	chrome.tabs.executeScript(activitiesLogID, {
		file: 'js/background/loadWork.js',
		runAt: 'document_idle'
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
        } else if(result.userSettings.school == 'grca'){
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