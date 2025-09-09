/////// SHORTHAND OPERATORS ///////
// message to background console
function bgConsole(sendCommand) {
	chrome.runtime.sendMessage({type: 'console', command: sendCommand});
}
// chrome local
var storage = chrome.storage.local;

/////// CryptoJS INIT ///////
var cryptoPass = "oca2018";

//check for dates to end early
var pageState = "inactive";
if (document.getElementById("startDate").getAttribute("Value") == null) {
	pageState = "inactive";
} else {
	pageState = "active";
}

if (pageState == "active") {
	// temporarily disable the approve buttton as the page loads\
	if(document.querySelector('#btnApprove')) {
		const approveBtn = document.querySelector('#btnApprove');
		approveBtn.disabled = true;
		approveBtn.setAttribute('style','border: 1px solid #565656;color:  #fff;text-shadow: 0 0 2px #010c24; background: #A4A4A4; background-image: linear-gradient(#A4A4A4, #7E7E7E);');
	}
	
	// get the student id for the current page
	var url = window.location.href;
	var studentID = url.match(/.idWebuser=\d*/)[0].substring(url.match(/.idWebuser=\d*/)[0].indexOf("=")+1);
	
	// get the dates from the current page
	var startDate = document.getElementById("startDate").value.toString();
	var endDate = document.getElementById("endDate").value.toString();
	var cutDate = new Date(endDate);
	cutDate.setTime(cutDate.getTime() - 6*(24*60*60*1000));
	storage.set({globalStartDate: startDate, globalEndDate: endDate});

	// temporarily disable approve button
	prepTable();
	getWork();
	adjustApproveButton();
	floatTotalDiv();

	// store the tab id for other funtions
	chrome.runtime.sendMessage({type: "storeTabID", tabTitle: 'actLogID'});
	checkAutomation();
}

function checkAutomation(){
	chrome.storage.local.get(null, (result) => {
		if((url.includes("&ccp=") || url.includes("&cte=")) && result.userSettings.school == 'oca') {
			// Update the student id storage
			storage.set({'studentID': studentID});
			// store the sender tab id to go back to it after this is all done
			chrome.runtime.sendMessage({type: "storeTabID", tabTitle: 'actLogID'});
			// send message to report to go get the work
			const url = location.href;
			const course = url.match(/(ccp|cte)/g)[0];
			// set timeVal as a global variable to reference later
			const time = url.match(/(?<=(ccp|cte)\=)[^\&]+/g)[0];
			// get the course elementId storred
			const elemId = result.chatLedger[result.userSettings.school].truancyDataView.measures[course + 'Hours'].domSelector.toString();; //result.schoolVars.truancy[course + 'Hours'].toString();
			console.log(elemId);

			// dv id
			let dataViewId = result.chatLedger[result.userSettings.school].truancyDataView.id;

			// get the time
			if(time == 'auto') {
				chrome.runtime.sendMessage({type: 'scrapeValue', url: `https://www.connexus.com/dataview/${dataViewId}?idWebuser=` + studentID, cssSelector: `${elemId}`}, async (response)=>{
					console.log(response);
					const autoString = "auto=check&course=" + course + "&time=" + response;
					var checkUrl = "https://www.connexus.com/activitytracker/default/weeksummary?idWebuser=" + url.match(/(?<=idWebuser\=)[\d]+/g)[0] + "&startDate=" + startDate + "&endDate=" + endDate + "&" + autoString;
					// gray out the button
					var cteccpButton = document.querySelector('#btnApprove');
					cteccpButton.disabled = true; // prevent clicking
					cteccpButton.setAttribute('time', response.toString());
					cteccpButton.value = `Checking ${course.toUpperCase()} Hours...`;
					cteccpButton.setAttribute('style','border: 1px solid #565656;color:  #fff;text-shadow: 0 0 2px #010c24; background: #A4A4A4; background-image: linear-gradient(#A4A4A4, #7E7E7E);');
					chrome.runtime.sendMessage({type: 'openPage', url: checkUrl, focused: false});
				});
			} else {
				var cteccpButton = document.querySelector('#btnApprove');
				cteccpButton.disabled = true; // prevent clicking
				cteccpButton.setAttribute('time', time);
				const autoString = "auto=check&course=" + course + "&time=" + time;
				var checkUrl = "https://www.connexus.com/activitytracker/default/weeksummary?idWebuser=" + url.match(/(?<=idWebuser\=)[\d]+/g)[0] + "&startDate=" + startDate + "&endDate=" + endDate + "&" + autoString;
				// gray out the button
				var cteccpButton = document.querySelector('#btnApprove');
				cteccpButton.value = `Checking ${course.toUpperCase()} Hours...`;
				cteccpButton.setAttribute('style','border: 1px solid #565656;color:  #fff;text-shadow: 0 0 2px #010c24; background: #A4A4A4; background-image: linear-gradient(#A4A4A4, #7E7E7E);');

				chrome.runtime.sendMessage({type: 'openPage', url: checkUrl, focused: false});
			}

		} else {
			console.log('getting courses');
			// quickly renable approve for non cte/ccp student
			if(document.querySelector('#btnApprove')) {
				const approveBtn = document.querySelector('#btnApprove');
				approveBtn.disabled = false;
				approveBtn.setAttribute('style','');
			}
			const autoString = "auto=getCourses";
			var checkUrl = "https://www.connexus.com/activitytracker/default/weeksummary?idWebuser=" + url.match(/(?<=idWebuser\=)[\d]+/g)[0] + "&startDate=" + formatDate(cutDate.toString(), 'YYYY-MM-DD') + "&endDate=" + formatDate(endDate.toString(), 'YYYY-MM-DD') + "&" + autoString;
			chrome.runtime.sendMessage({type: 'openPage', url: checkUrl, focused: false});
		}
	})
}

function checkCTECCP_old(){
	var url = window.location.href;
	// could fail if regex doesnt match
	try {
		const fullRegex = /(cte|ccp)=([\d.])+/g;
		const adjustString = url.match(fullRegex)[0];

		const typeRegex = /.*(?=\=)/g;
		const type = adjustString.match(typeRegex)[0];

		// if it has the adjparm in the url AND attendance has not been approved for this window
		if((type == "cte" || type == "ccp") && !document.querySelector('#btnUnapprove')){

			// get the adj string
			const regex = /(cte|ccp)=([\d.])+/g;
			const adjustString = url.match(regex) + "&approve=true";

			// add button to clean CAT
			const startDateRaw = document.querySelector('#startDate').value;
			const endDateRaw = document.querySelector('#endDate').value;
			const startDate = startDateRaw.split("/")[2] + "-" + startDateRaw.split("/")[0] + "-" + startDateRaw.split("/")[1];
			const endDate = endDateRaw.split("/")[2] + "-" + endDateRaw.split("/")[0] + "-" + endDateRaw.split("/")[1];
			
			//&startDate=2020-08-30&endDate=2020-09-05
			var adjustUrl = "https://www.connexus.com/activitytracker/default/weeksummary?idWebuser=" + url.match(/(?<=idWebuser\=)[\d]+/g)[0] + "&startDate=" + startDate + "&endDate=" + endDate + "&" + adjustString;

			var cteccpAdjustBtn = document.createElement("input");
			cteccpAdjustBtn.disabled = false;
			cteccpAdjustBtn.id = "btnAdjust";
			cteccpAdjustBtn.value = "Approve " + type.toUpperCase();
			cteccpAdjustBtn.type = "button";
			cteccpAdjustBtn.setAttribute('class','cxBtn cxPrimaryBtn');
			cteccpAdjustBtn.setAttribute('displayed','true');
			cteccpAdjustBtn.setAttribute('style','background: #03B85E url(/images/primaryBtnBg.png) 0 0 repeat-x');
			cteccpAdjustBtn.onclick = function(){
				var submit = window.confirm('NOTE: CTE and CCP students should not have manual time entered in any course other than their respective CTE/CCP section. \n\nThis will adjust the CAT for this student with the expected daily hours. Do not click anything as the CAT loads and adjusts. You will be presented with the final approval prompt back here when it is complete. \n\nWould you like to continue?');
				if(submit) {
					chrome.runtime.sendMessage({type: 'openPage', url: adjustUrl, focused: false, closeSender: true});
				}
			};
			document.querySelector('.formFields').appendChild(cteccpAdjustBtn);
			document.querySelector('#btnApprove').style.display = "none";
		}
	} catch(err) {
		// nothing
	}
}

function getTotalTime() {
	// Count the rows in the table to use throughout
	var rowCount = document.getElementById("activityGrid").getElementsByTagName("tbody")[0].getElementsByTagName("tr").length - 3;
	// calculate the total time and place it here: activityGrid_ctl01_lblNumRecords
	n = 0;
	var currentTime;
	var currentHours;
	var currentMin;
	var totalTime;
	var totalHours = 0;
	var totalMin = 0;
	while (n <= rowCount - 3) {
		currentTime = document.getElementById("activityGrid").getElementsByTagName("tbody")[0].getElementsByTagName("tr")[n + 3].getElementsByTagName("td")[2].innerText;
		if(currentTime.match("N/A")){currentTime = "0h 0min";}
		currentHours = parseInt(currentTime.match(/.+?(?=h)/));
		currentMin = parseInt(currentTime.match(/h (.*)min/)[1]);
		if (currentTime.substring(0, 1) == "-") { currentMin = currentMin * -1; }
		totalHours = totalHours + currentHours;
		totalMin = totalMin + currentMin;
		n++;
	}
	// if min > 60 convert to hours
	if (totalMin >= 60) {
		totalHours = totalHours + Math.floor(totalMin/60);
		totalMin = totalMin - (Math.floor(totalMin/60)*60);
	}
	//alert(totalHours + "h " + totalMin + "min ");
	document.getElementById('activityGrid_ctl01_lblNumRecords').innerText = 'Total Time: ' + totalHours + 'h ' + totalMin + 'min';
	
	// check if > 27.5 - 
	if (totalHours*60 + totalMin >= 1650) { document.getElementById('activityGrid_ctl01_pagerHeaderCell').setAttribute("style","background-color:#9fff96"); } else { document.getElementById('activityGrid_ctl01_pagerHeaderCell').setAttribute("style","background-color:#ff9696"); };
}

async function getWork() {
	// store global dates
	var startDate = document.getElementById("startDate").value.toString();
	var endDate = document.getElementById("endDate").value.toString();
	storage.set({'globalStartDate': startDate});
	storage.set({'globalEndDate': endDate});
	// Update the student id storage
	storage.set({'studentID': studentID});
	// store the sender tab id to go back to it after this is all done
	chrome.runtime.sendMessage({type: "storeTabID", tabTitle: 'actLogID'});
	// send message to report to go get the work
	chrome.storage.local.get(null, function(result) {
		storage.set({'getWorkLoop': 0});
		chrome.runtime.sendMessage({type: "getWork"});
	});
}

function floatTotalDiv() {
	var totalTimeDiv = document.getElementsByClassName("rollup-total")[0];
	totalTimeDiv.setAttribute("style", "position: fixed; bottom: 45px; right: 3.5%; background: white; background: #ffffff; padding: 15px; text-align: left; border-style: solid; border-width: 2px; border-radius: 5px; border-color: #8c8c8c; box-shadow: rgba(0,0,0,0.2) 0px 1px 3px;");
}

function addCells(rowNumber, dateCount, currentDate) {
	storage.get(null, function(result) {
		
		// Setup the current row to add cells
		var currentRow = document.getElementById("activityGrid").getElementsByTagName("tbody")[0].getElementsByTagName("tr")[rowNumber];
	
		///// Create and add the new cells
		// lesson count
		var lessonCountCell = document.createElement("td");
		lessonCountCell.setAttribute("align", "center");
		lessonCountCell.id = "lessonCountCell" + currentDate.trim();
		lessonCountCell.setAttribute("rowspan", dateCount);
		document.getElementById("activityGrid").getElementsByTagName("tbody")[0].getElementsByTagName("tr")[rowNumber].insertBefore(lessonCountCell, currentRow.childNodes[4]);

		// assessment count
		var asstCountCell = document.createElement("td");
		var asstCountButton = document.createElement("button");
		asstCountButton.id = "asstCountButton" + currentDate.trim();
		asstCountButton.innerText = "--";
		asstCountButton.type = "button";
		asstCountButton.onclick = function() {checkAssessments(studentID, currentDate);};
		asstCountCell.setAttribute("align", "center");
		asstCountCell.id = "asstCountCell" + currentDate.trim();
		asstCountCell.setAttribute("rowspan", dateCount);
		asstCountCell.appendChild(asstCountButton);
		document.getElementById("activityGrid").getElementsByTagName("tbody")[0].getElementsByTagName("tr")[rowNumber].insertBefore(asstCountCell, currentRow.childNodes[4]);

		// compile dates in the left column
		var rowspan = document.getElementById('lessonCountCell' + currentDate).getAttribute('rowspan');
		document.getElementById("activityGrid").getElementsByTagName("tbody")[0].getElementsByTagName("tr")[rowNumber].getElementsByTagName("td")[0].setAttribute('rowspan', rowspan);
		for(i=1; i<rowspan; i++) {
			document.getElementById("activityGrid").getElementsByTagName("tbody")[0].getElementsByTagName("tr")[rowNumber + i].getElementsByTagName("td")[0].setAttribute('style', 'display:none');
		}
	});
}

function prepTable() {

	// Count the rows in the table to use throughout
	var rowCount = document.getElementById("activityGrid").getElementsByTagName("tbody")[0].getElementsByTagName("tr").length - 1;

	// Create New Cells to add to header
	var asstCountHeader = document.createElement("th");
	asstCountHeader.id = "asstCountHeader";
	asstCountHeader.innerText = "Asmnt.";
	asstCountHeader.setAttribute("scope","col");

	var lessonCountHeader = document.createElement("th");
	lessonCountHeader.id = "lessonCountHeader";
	lessonCountHeader.innerText = "Lssn.";
	lessonCountHeader.setAttribute("scope","col");
	
	// Add the headers
	var tableHeader = document.getElementById("activityGrid").getElementsByTagName("tr")[0];
	tableHeader.insertBefore(lessonCountHeader, tableHeader.childNodes[4]);
	tableHeader.insertBefore(asstCountHeader, tableHeader.childNodes[4]);

	///// count date occurances and create block cells
	// check date of first row
	var dateCount = 1;
	i = 1;
	// set the two checking rows
	var currentDate = document.getElementById("activityGrid").getElementsByTagName("tbody")[0].getElementsByTagName("tr")[i].getElementsByTagName("td")[0].innerText.trim();
	var nextDate = document.getElementById("activityGrid").getElementsByTagName("tbody")[0].getElementsByTagName("tr")[i + 1].getElementsByTagName("td")[0].innerText.trim();
	
	while (i <= rowCount - 1)
	{
		var nextDateCellClass = document.getElementById("activityGrid").getElementsByTagName("tbody")[0].getElementsByTagName("tr")[i + 1].getAttribute('class');
		//alert("checking if " + currentDate + " matches " + nextDate);
		if (nextDateCellClass != 'date-header-row' && nextDateCellClass != 'date-header-row shade' ) {
			//alert("match!");
			dateCount++;
		} else {
			addCells(i-(dateCount-1), dateCount, currentDate);
			currentDate = nextDate;
			dateCount = 1;
		}
		i++;
		try {
			var nextDate = document.getElementById("activityGrid").getElementsByTagName("tbody")[0].getElementsByTagName("tr")[i+1].getElementsByTagName("td")[0].innerText;
		} catch(err) {
			addCells(i-(dateCount-1), dateCount, currentDate);
			currentDate = nextDate;
			dateCount = 1;
		}
	}
}

function checkAssessments(studentID, assessmentDate) {
	storage.set({'assessmentDate': assessmentDate});
	chrome.runtime.sendMessage({type: 'checkAssessments', studentID: studentID});
}

function adjustApproveButton() {
	storage.get(null, function (result) {
		var studentID = url.match(/.idWebuser=\d*/)[0].substring(url.match(/.idWebuser=\d*/)[0].indexOf("=")+1);
		// approve button
		try{ 
			document.querySelector('#btnApprove').setAttribute('studentId', studentID);
			document.querySelector('#btnApprove').onclick = function() {changeAttendanceStatus(this.getAttribute('studentid'), true)}
		} catch (err) {
			document.querySelector('#btnUnapprove').setAttribute('studentId', studentID);
			document.querySelector('#btnUnapprove').onclick = function() {changeAttendanceStatus(this.getAttribute('studentid'), false)};
		}
	});
}

function changeAttendanceStatus(studentId, complete) {
	chrome.runtime.sendMessage({'type':'updateStudentAttribute', 'studentId': studentId, 'attribute': 'complete', 'newValue': complete})
}

function formatDate(dateString, format) {
	let date = new Date(dateString);
	let result = '';
	if(format == 'YYYY-MM-DD') {
		let year = date.getFullYear();
		let month = date.getMonth()+1 < 10 ? "0" + (date.getMonth()+1) : date.getMonth()+1;
		let day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
		result = `${year}-${month}-${day}`;
	}
	return result;
}