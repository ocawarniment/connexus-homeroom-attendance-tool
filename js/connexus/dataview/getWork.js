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
			
		//Uncheck all assessments types
		var surveyCheck = document.getElementById("Gradebook_AssessmentsCompleted[0]");
		var discussionCheck = document.getElementById("Gradebook_AssessmentsCompleted[1]");
		var draftCheck = document.getElementById("Gradebook_AssessmentsCompleted[2]");
		var examCheck = document.getElementById("Gradebook_AssessmentsCompleted[3]");
		var finalCheck = document.getElementById("Gradebook_AssessmentsCompleted[4]");
		var partCheck = document.getElementById("Gradebook_AssessmentsCompleted[5]");
		var portCheck = document.getElementById("Gradebook_AssessmentsCompleted[6]");
		var pracCheck = document.getElementById("Gradebook_AssessmentsCompleted[7]");
		var preCheck = document.getElementById("Gradebook_AssessmentsCompleted[8]");
		var quickCheck = document.getElementById("Gradebook_AssessmentsCompleted[9]");
		var quizCheck = document.getElementById("Gradebook_AssessmentsCompleted[10]");
		var reflCheck = document.getElementById("Gradebook_AssessmentsCompleted[11]");
		var samplCheck = document.getElementById("Gradebook_AssessmentsCompleted[12]");
		var skilCheck = document.getElementById("Gradebook_AssessmentsCompleted[13]");
		var testCheck = document.getElementById("Gradebook_AssessmentsCompleted[14]");

		if (surveyCheck.getAttribute("checked") == "checked") { surveyCheck.click(); }
		if (discussionCheck.getAttribute("checked") == "checked") { discussionCheck.click(); }
		if (draftCheck.getAttribute("checked") == "checked") { draftCheck.click(); }
		if (examCheck.getAttribute("checked") == "checked") { examCheck.click(); }
		if (finalCheck.getAttribute("checked") == "checked") { finalCheck.click(); }
		if (partCheck.getAttribute("checked") == "checked") { partCheck.click(); }
		if (portCheck.getAttribute("checked") == "checked") { portCheck.click(); }
		if (pracCheck.getAttribute("checked") == "checked") { pracCheck.click(); }
		if (preCheck.getAttribute("checked") == "checked") { preCheck.click(); }
		if (quickCheck.getAttribute("checked") == "checked") { quickCheck.click(); }
		if (quizCheck.getAttribute("checked") == "checked") { quizCheck.click(); }
		if (reflCheck.getAttribute("checked") == "checked") { reflCheck.click(); }
		if (samplCheck.getAttribute("checked") == "checked") { samplCheck.click(); }
		if (skilCheck.getAttribute("checked") == "checked") { skilCheck.click(); }
		if (testCheck.getAttribute("checked") == "checked") { testCheck.click(); }
		
		// click the save button to reload
		document.getElementById("save").click();

		chrome.runtime.sendMessage({type: "reloadWork"});

	});
}

