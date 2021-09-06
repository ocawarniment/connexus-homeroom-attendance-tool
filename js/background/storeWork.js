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

storeWork();

function storeWork() {
	allLessons = document.getElementById("EF_LessonsCompleted_ByCourse").innerText
	allAssessments = document.getElementById("EF_AssessmentsCompleted_ByCourse").innerText

	chrome.storage.local.get(null, function(result) {
		var startDate = new Date(result.globalStartDate);
		var endDate = new Date(result.globalEndDate);
		startDate.setDate(startDate.getDate());
		endDate.setDate(endDate.getDate());
		//var timeDiff = Math.abs(endDate.getTime() - startDate.getTime());
		//var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24) + 1); 
		//alert(diffDays + " days");
			
		// prepare lesson and assessment array lists
		var lessonsList = {};
		lessonsList['totalLessons'] = document.getElementById('EF_CountLessonsCompleted').innerText;
		var assessmentsList = {};
		assessmentsList['totalAssessments'] = document.getElementById('EF_CountAssessmentsCompleted').innerText;
		
		// begin loop to build lesson and assessment array lists
		var runningLessonCount = 0;
		var runningAssessmentCount = 0;
		var loopDate = startDate;
		while (loopDate <= endDate) {
			// count the lessons for the current loop date
			lessonsList[formatDate(loopDate)] = (allLessons.match(new RegExp(formatDate(loopDate), "g")) || []).length;
			runningLessonCount = runningLessonCount + (allLessons.match(new RegExp(formatDate(loopDate), "g")) || []).length;
			// count the assessments for the current loop date
			bgConsole(loopDate.toString());
			bgConsole((allAssessments.match(new RegExp(formatDate(loopDate), "g")) || []).length);
			assessmentsList[formatDate(loopDate)] = (allAssessments.match(new RegExp(formatDate(loopDate), "g")) || []).length;
			runningAssessmentCount = runningAssessmentCount + (allAssessments.match(new RegExp(formatDate(loopDate), "g")) || []).length;
			// increase to the next day
			loopDate.setDate(loopDate.getDate()+1);
		}
		
		if (lessonsList['totalLessons'].toString() !== runningLessonCount.toString() || assessmentsList['totalAssessments'].toString() !== runningAssessmentCount.toString()) {
			// lessons do not add up gotta start over... :(
			//bgConsole('counts are not correct');
			//bgConsole('lessons: ' + lessonsList['totalLessons'].toString() + "/" + runningLessonCount.toString() + " | " + "assessments: " + assessmentsList['totalAssessments'].toString() + "/" + runningAssessmentCount.toString());
			//setDates();

			// assume the bug in the DV and set the counts to match our local count
			// add array to storage
			storage.set({'lessonsArray': lessonsList});
			console.log(lessonsList);
			storage.set({'assessmentsArray': assessmentsList});
			// send message to update the activities log
			chrome.runtime.sendMessage({type: "updateWork"});
			window.close();
		} else {
			// lessons add up. DONE!
			// add array to storage
			storage.set({'lessonsArray': lessonsList});
			console.log(lessonsList);
			storage.set({'assessmentsArray': assessmentsList});
			// send message to update the activities log
			chrome.runtime.sendMessage({type: "updateWork"});
			
			window.close();
		}
	});
}