/////// Function delcations ////////
// chrome local
var storage = chrome.storage.local;
// message to background console
function bgConsole(sendCommand) {
	chrome.runtime.sendMessage({type: 'console', command: sendCommand});
}

// function to format dates to mm/dd/yyyy
function formatDateString(date) {
	var dateString = date.toString();
	var splitDateString = dateString.split("-");
	return splitDateString[1] + "/" + splitDateString[2] + "/" + splitDateString[0];
}
function formatDate(date) {
	var dateObj = new Date(date);
	var formattedDate = (dateObj.getMonth()+1) + "/" + (dateObj.getDate()) + "/" + dateObj.getFullYear();
	return formattedDate;
}

// clear prior lesson and assessment arrays
storage.remove('lessonsArray');
storage.remove('assessmentsArray');

setDates();

setTimeout(function() {chrome.runtime.sendMessage({type: "storeWork", closeSender: true});}, 200);

function setDates() {
	storage.get(null, function(result) {
		var workLoop = result.getWorkLoop;
		storage.set({'getWorkLoop': workLoop + 1});
		
		var startDate = result.globalStartDate;
		var endDate = result.globalEndDate;
		
		//Input startDate
		document.getElementById("StartDate_AssessmentsCompleted").value = startDate;
		document.getElementById("StartDate_LessonsCompleted").value = startDate;
			
		//Input endDate
		document.getElementById("EndDate_AssessmentsCompleted").value = endDate;
		document.getElementById("EndDate_LessonsCompleted").value = endDate;
		
		//Section ID cells
		document.getElementById("CourseID_AssessmentsCompleted").value = "";
		document.getElementById("CourseID_LessonsCompleted").value = "";
			
		// Reset every assessment type. Connexus can add options, so do not depend on fixed indexes.
		document.querySelectorAll('input[id^="Gradebook_AssessmentsCompleted["]').forEach(function(assessmentCheck) {
			if (assessmentCheck.checked) assessmentCheck.click();
		});
		
		// click the save button to reload
		document.getElementById("save").click();

		chrome.runtime.sendMessage({type: "reloadWork"});

	});
}
