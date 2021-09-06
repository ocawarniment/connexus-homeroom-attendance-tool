/////// Function delcations ////////
// chrome local
var storage = chrome.storage.local;
// message to background console
function bgConsole(sendCommand) {
	chrome.runtime.sendMessage({type: 'console', command: sendCommand});
}

// create
createWeekSnapshot();

// prep for total calculations
var weekLessonCount = 0;
var weekAssessmentCount = 0

// loop through and set all daily lesson counts
var lessonCells = document.getElementsByTagName("td");
storage.get(null, function (result) {
	for(var i = 0; i < lessonCells.length; i++) {
		var rowDate;
		if(lessonCells[i].id.indexOf('lessonCountCell') == 0) {
			rowDate = lessonCells[i].id.match(/\d*\/\d*\/\d*/g).toString();
			document.getElementById("lessonCountCell" + rowDate).innerText = result.lessonsArray[rowDate];
			// increase week count
			weekLessonCount = weekLessonCount + result.lessonsArray[rowDate];
		}
	}
	document.getElementById('lessonSubheader').innerText = "Lessons: " + weekLessonCount;
});

// loop through and set all daily assessment counts
var assessmentButtons = document.getElementsByTagName("button");
storage.get(null, function (result) {
	for(var i = 0; i < assessmentButtons.length; i++) {
		if(assessmentButtons[i].id.indexOf('asstCountButton') == 0) {
			rowDate = assessmentButtons[i].id.match(/\d*\/\d*\/\d*/g).toString();
			document.getElementById("asstCountButton" + rowDate).innerHTML = result.assessmentsArray[rowDate];
			// increase week count
			weekAssessmentCount = weekAssessmentCount + result.assessmentsArray[rowDate];
		}
	}
	document.getElementById('assessmentSubheader').innerText = "Assessments: " + weekAssessmentCount;
});

// create upper pannel for week snapshot
function createWeekSnapshot() {
	// set color for IA list
	var backColor;
	backColor = "#eeeeee";
	var borderColor;
	borderColor = "#E57373";

	// create the alarm panel
	var weekSnapshot = document.createElement("div");
	weekSnapshot.id = "weekSnapshot";
	weekSnapshot.setAttribute("style", "position: relative; background: " + backColor + "; margin: 10px; width: 475px;  padding: 15px; text-align: left; border-style: solid; border-width: 2px; border-radius: 5px; border-color: " + borderColor + ";  box-shadow: rgba(0,0,0,0.2) 0px 1px 3px;");

	// create left snapshot div
	var metricsPanel = document.createElement("div");
	metricsPanel.id = "metricsPanel";
	metricsPanel.setAttribute("style","display: inline");

	// create the header with status
	var weekHeader = document.createElement("h2");
	weekHeader.id = "weekHeader";
	weekHeader.setAttribute("style", "color: #000; opacity: 0.87; padding: 0px");
	weekHeader.innerText = "Week Snapshot";
	//metricsPanel.appendChild(weekHeader);

	// create the subheader with details
	var lessonSubheader = document.createElement("span");
	lessonSubheader.id = "lessonSubheader";
	lessonSubheader.setAttribute("style", "font-size: 11pt; padding: 0.8em; opacity: 0.66; margin-bottom: 10px");
	lessonSubheader.innerText = "Lessons"
	metricsPanel.appendChild(lessonSubheader);

	var assessmentSubheader = document.createElement("span");
	assessmentSubheader.id = "assessmentSubheader";
	assessmentSubheader.setAttribute("style", "font-size: 11pt; padding: 0.8em; opacity: 0.66; margin-bottom: 10px");
	assessmentSubheader.innerText = "Assessments"
	metricsPanel.appendChild(assessmentSubheader);

	// add the snapshot to the left metrics panel
	weekSnapshot.appendChild(metricsPanel);

	// create the button dive
	var togglePanel = document.createElement("div");
	togglePanel.id = "togglePanel";
	togglePanel.setAttribute("style","display: relative");

	// create the daily button toggle
	var dailyCountsButton = document.createElement("button");
	dailyCountsButton.id = "dailyCountsButton";
	dailyCountsButton.innerText = "Daily Counts";
	dailyCountsButton.type = "button";
	dailyCountsButton.setAttribute('class','cxBtn');
	dailyCountsButton.setAttribute('displayed','false');
	dailyCountsButton.setAttribute('style','position: absolute; right: 10px; top: 8px;');
	dailyCountsButton.onclick = function() {
		if(dailyCountsButton.getAttribute('displayed') == 'false'){showDailyAssessments(); showDailyLessons(); 	dailyCountsButton.setAttribute('displayed','true'); document.getElementById("weekSnapshot").setAttribute("style","position: relative; background: #eeeeee; margin: 10px; width: 570px;  padding: 15px; text-align: left; border-style: solid; border-width: 2px; border-radius: 5px; border-color: #E57373;  box-shadow: rgba(0,0,0,0.2) 0px 1px 3px;");} else {hideDailyAssessments(); hideDailyLessons(); 	dailyCountsButton.setAttribute('displayed','false'); document.getElementById("weekSnapshot").setAttribute("style","position: relative; background: #eeeeee; margin: 10px; width: 475px;  padding: 15px; text-align: left; border-style: solid; border-width: 2px; border-radius: 5px; border-color: #E57373;  box-shadow: rgba(0,0,0,0.2) 0px 1px 3px;");}
	};
	weekSnapshot.appendChild(dailyCountsButton);
	//weekSnapshot.appendChild(togglePanel);

	// find the place to put it, and place it
	var trackerPanel = document.getElementById("activityGrid");
	trackerPanel.parentNode.insertBefore(weekSnapshot, trackerPanel);

	// place the send and creat pannel
	createHeader();
}

// hide by default
hideDailyAssessments();
hideDailyLessons();
dailyCountsButton.setAttribute('displayed','false');

function hideDailyAssessments() {
	var tableCells = document.getElementById("activityGrid").getElementsByTagName("td");
	var i=0;
	while(i < tableCells.length) {
		if(tableCells[i].getAttribute("id") !== null) {
			if(tableCells[i].getAttribute("id").toString().includes("asstCount") == true) {
				tableCells[i].setAttribute("style","display:none");
			}
		}
		i++;
	}
	document.getElementById('asstCountHeader').setAttribute("style","display:none");
}

function hideDailyLessons() {
	var tableCells = document.getElementById("activityGrid").getElementsByTagName("td");
	var i=0;
	while(i < tableCells.length) {
		if(tableCells[i].getAttribute("id") !== null) {
			if(tableCells[i].getAttribute("id").toString().includes("lessonCount") == true) {
				tableCells[i].setAttribute("style","display:none");
			}
		}
		i++;
	}
	document.getElementById('lessonCountHeader').setAttribute("style","display:none");
}

function showDailyAssessments() {
	var tableCells = document.getElementById("activityGrid").getElementsByTagName("td");
	var i=0;
	while(i < tableCells.length) {
		if(tableCells[i].getAttribute("id") !== null) {
			if(tableCells[i].getAttribute("id").toString().includes("asstCount") == true) {
				tableCells[i].setAttribute("style","");
			}
		}
		i++;
	}
	document.getElementById('asstCountHeader').setAttribute("style","");
	//document.getElementById('activityGrid_ctl01_pagerHeaderCell').setAttribute('colspan','8');
	//document.getElementById('activityGrid_ctl17_pagerFooterCell').setAttribute('colspan','8');
}

function showDailyLessons() {
	var tableCells = document.getElementById("activityGrid").getElementsByTagName("td");
	var i=0;
	while(i < tableCells.length) {
		if(tableCells[i].getAttribute("id") !== null) {
			if(tableCells[i].getAttribute("id").toString().includes("lessonCount") == true) {
				tableCells[i].setAttribute("style","");
			}
		}
		i++;
	}
	document.getElementById('lessonCountHeader').setAttribute("style","");
	//document.getElementById('activityGrid_ctl01_pagerHeaderCell').setAttribute('colspan','8');
	//document.getElementById('activityGrid_ctl17_pagerFooterCell').setAttribute('colspan','8');
}

function createHeader() {
	// Add download button to the top
	// create Button Bar Table
	var buttonBar = document.createElement("div");
	buttonBar.setAttribute('style', "padding-bottom:15px");
	//create new button for create log
	var createLogButton = document.createElement("input");
	createLogButton.name = "createLogButton";
	createLogButton.id = "createLogButton";
	createLogButton.type = "submit";
	createLogButton.value = "Create Log";
	createLogButton.setAttribute('class', "cxBtn");
	createLogButton.setAttribute('style', "margin: 0 5px 5px 0");
	createLogButton.onclick = createLog; 
	//create new button for send WebMail
	var sendWebmailButton = document.createElement("input");
	sendWebmailButton.name = "sendWebmailButton";
	sendWebmailButton.id = "sendWebmailButton";
	sendWebmailButton.type = "submit";
	sendWebmailButton.value = "Send WebMail";
	sendWebmailButton.setAttribute('class', "cxBtn");
	sendWebmailButton.setAttribute('style', "margin: 0 5px 5px 0");
	sendWebmailButton.onclick = sendWebmail;// add buttons to button bar div
	//buttonBar.appendChild(addActivityButton);
	buttonBar.appendChild(sendWebmailButton);
	buttonBar.appendChild(createLogButton);
    
    // add the textarea and buttonbar
	var body = document.getElementById("totalTimeDisplayedLabel");
	body.insertBefore(buttonBar, body.firstChild);
}

function createLog() {
    // check if not approved
    if(document.getElementById("btnUnapprove") != null) {
        var name = document.getElementById('pageTitleHeaderTextSpan').innerText;
        name = name.substr(27);
        name = name.match(/^[^\s]+/g);
        // get the student id for the current page
        var url = window.location.href;
        var studentID = url.match(/.idWebuser=\d*/)[0].substring(url.match(/.idWebuser=\d*/)[0].indexOf("=")+1);
        // get adjustments
        var adjustments = getTimeAdjustments();
        storage.set({'timeAdjustments': adjustments});
        // get dates
        var startDate = document.getElementById("startDate").value;
        var endDate = document.getElementById("endDate").value;
        // get lesson counts
        var lessons = document.getElementById("lessonSubheader").innerText;
        var assessments = document.getElementById("assessmentSubheader").innerText;
        storage.set({'studentLessons': lessons});
        storage.set({'studentAssessments': assessments});

        storage.set({'studentID': studentID});
        chrome.runtime.sendMessage({type: 'createLog', studentID: studentID});
        
        return false;
    } else {
        alert("Be sure to approve attendance before trying to send a WebMail or create a log entry.")
        return false;
    }
}

function sendWebmail() {
    // check if not approved
    if(document.getElementById("btnUnapprove") != null) {
        var name = document.getElementById('pageTitleHeaderTextSpan').innerText;
        name = name.substr(27);
        name = name.match(/^[^\s]+/g);
        // get the student id for the current page
        var url = window.location.href;
        var studentID = url.match(/.idWebuser=\d*/)[0].substring(url.match(/.idWebuser=\d*/)[0].indexOf("=")+1);
        // get adjustments
        var adjustments = getTimeAdjustments();
        storage.set({'timeAdjustments': adjustments});
        // get dates
        var startDate = document.getElementById("startDate").value;
        var endDate = document.getElementById("endDate").value;
        // get lesson counts
        var lessons = document.getElementById("lessonSubheader").innerText;
        var assessments = document.getElementById("assessmentSubheader").innerText;
        storage.set({'studentLessons': lessons});
        storage.set({'studentAssessments': assessments});

        storage.set({'webmailStudentName': name});
        storage.set({'studentID': studentID});
        chrome.runtime.sendMessage({type: 'sendWebmail', studentID: studentID, startDate: startDate, endDate: endDate, lessons: lessons, assessments: assessments});

        return false;
    } else {
        alert("Be sure to approve attendance before trying to send a WebMail or create a log entry.")
        return false;
    }
}

function getTimeAdjustments() {
    if(document.getElementById("btnApprove") == null)
    {
        var adjustmentsArray = [];
        var tableRows = document.getElementsByTagName("tr");
        for(i=1;i<tableRows.length;i++) {
            if(tableRows[i].getElementsByTagName("td")[1].innerText.trim() == 'Time Adjustment') {
				var adjustment = tableRows[i].getElementsByTagName("td")[2].innerText.trim();
				if(adjustment.substring(0,1) != "-") { adjustment = "+" + adjustment; }
                // loop checking td 0 until date is found
                n = i - 1;
                var found = false;
                while(found == false) {
                    if(tableRows[n].getElementsByTagName("td")[0].innerText.trim() == '') {
                        found = false;
                        n = n - 1;
                    } else {
                        date = tableRows[n].getElementsByTagName("td")[0].innerText.trim();
                        found = true;
                    }
                }
                adjustmentsArray.push(date + " - Time Adjustment " + adjustment);
            } 
        }
        return adjustmentsArray;
    }
}