var storage = chrome.storage.local;
// message to background console
function bgConsole(sendCommand) {
	chrome.runtime.sendMessage({type: 'console', command: sendCommand});
}

/////// CryptoJS INIT ///////
var cryptoPass = "oca2018";

// reset the date mode
storage.set({'manualDateMode': "FALSE"});

// allow for backup plan?
var BACKUP_PLAN = true;

// temporarily wait until the page has loaded completely
getStudents();

function getStudents() {	
	var loopCount = 0;
	bgConsole('attempting...');
	checkLoad('sections-and-students');

	function checkLoad(elementID) {
		setTimeout(function() {
			if (checkElement(elementID) == false) {
				loopCount = loopCount + 1;
				bgConsole('check element returns false. Starting attempt #' + loopCount);
				if (loopCount <= 7) {
					checkLoad(elementID);
				} else {
					window.alert('It appears you are not the homeroom teacher on this section and cannot access Overdue Lessons. \n\nLessons Behind will be used as the primary Lesson Completion Measure. This message will continue to popup until this setting is changed on the CHAT Settings page.');
				}
			} else {	
				// check if this is the section they wanted. prompt for other section
				if(window.location.href=="https://www.connexus.com/sectionsandstudents#/mystudents/" & BACKUP_PLAN==true) {
					// user does not have access to section. prompt for alt method
					window.alert('You are not a homeroom teacher in this section. Please review the section ID or uncheck "Homeroom Section" on the attendance assitant.');
				}

				try{
					// get number of students
					var studentCountString; // string to cut down to extract the number
					var studentcount; // integer to use in loops
					studentCountString = document.getElementsByClassName("sas-student-count ng-binding")[0].children[0].innerText;
					studentCountString = studentCountString.match(/\d+/g)[0];
					studentCount = studentCountString;
				} catch(err) {
					// shouldnt happen....
					bgConsole('check element returned true, yet DOM did not load the student table');
				}
				// check that it is homeroom
				var sectionTitle = document.getElementsByClassName('chosen-container chosen-container-single')[0].childNodes[0].childNodes[0].innerText;
				if(sectionTitle.indexOf('Homeroom') !== -1) {
					// collect the table
					var studentTable;
					studentTable = document.getElementById("sections-and-students").getElementsByTagName("table")[0];
					scanTable();
				} 
			}
			function checkElement(elementID) {
				var status = true;
				bgConsole('checking for the element...');
				try {
					// If theres an error end
					try { 
						var checkError = document.getElementById('sections-and-students').innerText; 
						if (checkError.indexOf('Error') !== -1) { alert("No section exists with that ID! Please review the Homeroom ID."); chrome.runtime.sendMessage({type: 'closeTab'});} 
					}catch(err) { }
					// try scanTable and if it works, GREAT were done!
					// get number of students
					var studentCountString; // string to cut down to extract the number
					var studentcount; // integer to use in loops
					studentCountString = document.getElementsByClassName('sas-student-count ng-binding')[0].innerText;
					studentCountString = studentCountString.match(/\d+(?=\W)/g)[0];
					studentCount = studentCountString;
					var checkElement = document.getElementsByClassName("my-students cxForm ng-scope")[0].getElementsByClassName("cxTable ng-scope")[0].getElementsByTagName("tbody")[0].getElementsByTagName("tr")[studentCount - 1].innerText;
				} catch(err) {
					bgConsole('element not loaded...');
					status = false;
				}
				return status;
			}
		},1000);
	}
}

function scanTable() {
	storage.get(null, function(result) {
        // get current students
        let homeroomArray = result.students;
		// print all tbody elements
		var studentRows;
		studentRows = document.getElementsByClassName("my-students cxForm ng-scope")[0].getElementsByClassName("cxTable ng-scope")[0].getElementsByTagName("tbody")[0].getElementsByTagName("tr");
		
		// get number of students
		var studentCountString; // string to cut down to extract the number
		var studentcount; // integer to use in loops
		studentCountString = document.getElementsByClassName("sas-student-count ng-binding")[0].innerText;
		studentCountString = studentCountString.match(/\d+/g)[0];
		studentCount = studentCountString;
		
		// get the OD column
		let headerColIndex = -1;
		let headerCSS = document.querySelectorAll('[cx-html-compile="column.displayName"]');
		let headers = [].slice.call(headerCSS);
		headerColIndex = headers.findIndex(header => {return header.innerText == 'Total Overdue'});

		if(headerColIndex >= 0) {
			for(i=0; i<studentRows.length; i++){
				let studentCells = studentRows[i].querySelectorAll('td');
				let studentId = studentCells[0].innerText;
				let overdueLessonsString = studentCells[headerColIndex].innerText;
				let overdueLessonsMatch = overdueLessonsString.match(/\d+/);
				let overdueLessons = overdueLessonsMatch !== null ? parseInt(overdueLessonsMatch[0]) : 0;
				// set OD lessons
				homeroomArray[`ST${studentId}`]['overdueLessons'] = overdueLessons || 0;
				// overwrite lessonsBehind as lessonCompMetric
				homeroomArray[`ST${studentId}`]['lessonCompMetric'] = overdueLessons || 0;
			}

			// put back to storage
			storage.set({'students': homeroomArray});

			// alert completion
			window.alert('Section download complete!');
		} else {
			window.alert('Please enable the Total Overdue column to download student overdue lesson counts. Lessons Behind will be used as the primary Lesson Completion Measure until this column is enabled and the section is redownloaed.');
		}

		/*
		// get the overdue column
		let overdueCol;
		let overdueFound = false;
		headers = document.getElementsByClassName("my-students cxForm ng-scope")[0].getElementsByClassName("cxTable ng-scope")[0].getElementsByTagName("thead")[0].getElementsByTagName("th");
		h = 3;
		while (h < headers.length) {
			try {
				headerText = headers[h].getElementsByTagName("a")[0].getElementsByTagName("span")[0].getElementsByTagName("span")[0].innerText
				if (headerText == "Overall Score") {
					overdueCol = h;
					overdueFound = true;
				}
			} catch(err) {}
			h++;
		}
		
		// if OD column never found close
		if (headerColIndex > 0) {
			// adjust for row index

			i = 0;
			while (i <= studentCount - 1) {
				
				bgConsole("table loop");
				var studentID;
				studentID = studentRows[i].getElementsByTagName("td")[0].innerText.trim();
                
                var studentOverdue;
				studentOverdue = studentRows[i].getElementsByTagName("td")[overdueCol].innerText;
				if (studentOverdue.search("lesson") != -1) {studentOverdue = studentOverdue.match(/\d+/g)[0]} else {studentOverdue = 0}
				homeroomArray['ST' + studentID]['overdue'] = studentOverdue;
				
				i++;
			}

			// alert
			window.alert(`storring od lessons from column ${h}`);
			
			// set the array to access it on the popup
			storage.set({'students': homeroomArray});

		} else {
			// try to sort and enable it first
			alert("Please make sure the 'Total Overdue' column is enabled.");
			document.getElementsByClassName("column-select-menu collapse")[0].setAttribute('style','height: 352px');
		}
		*/
	});
}
