var storage = chrome.storage.local;
// message to background console
function bgConsole(sendCommand) {
	chrome.runtime.sendMessage({ type: 'console', command: sendCommand });
}

/////// CryptoJS INIT ///////
var cryptoPass = "oca2018";

(async () => {
	try {
		const studentData = await getStudentsAPI();
		if (!Array.isArray(studentData.students) || studentData.students.length === 0) {
			throw new Error('No overdue lesson data was returned. Confirm that you are the homeroom teacher for this section.');
		}

		const { students: homeroomArray = {} } = await storage.get('students');
		let updatedCount = 0;
		studentData.students.forEach(student => {
			const studentKey = `ST${student.idWebuser}`;
			// The API includes inactive students, while the roster intentionally does
			// not. Ignore entries that were not part of this download.
			if (!homeroomArray[studentKey]) return;
			const overdueLessons = student.totalOverdueLessons ?? 0;
			homeroomArray[studentKey].overdueLessons = overdueLessons;
			homeroomArray[studentKey].lessonCompMetric = overdueLessons;
			updatedCount += 1;
		});

		if (!updatedCount) {
			throw new Error('The homeroom overdue data did not match any students in this section.');
		}

		await storage.set({ students: homeroomArray });
		chrome.runtime.sendMessage({ type: 'overdueScrapeComplete', count: updatedCount });
	} catch (error) {
		console.error('Unable to download overdue lesson counts:', error);
		chrome.runtime.sendMessage({ type: 'overdueScrapeError', message: error.message || 'Unable to download overdue lesson counts.' });
	}
})();

// tap into the azure API call with cookies storred on the users machine
async function getStudentsAPI() {
	// get the sectionId
	const regex = /(?<=mystudents\/)\d*/gm;
	let sectionId = window.location.href.match(regex)[0];

	// set the url
	const cookies = Object.fromEntries(document.cookie.split('; ').filter(Boolean).map(cookie => cookie.split('=')));
	if (!cookies.idWebuserEncrypted) throw new Error('Connexus user session was unavailable.');
	let reqUrl = `https://www.connexus.com/api/section/students?idWebuser=${cookies.idWebuserEncrypted}&idSection=${sectionId}&includeInactive=true`;

	// send request
	const response = await fetch(reqUrl, {
		method: "GET",
		credentials: 'same-origin'
	});
	if (!response.ok) throw new Error(`Connexus overdue lesson request failed (${response.status}).`);

	const responseData = await response.json();

	// Check for developer mode setting to randomize overdue lesson counts
	return new Promise((resolve) => {
		storage.get(['userSettings'], (result) => {
			const userSettings = result.userSettings || {};
			const shouldRandomize = userSettings.randomizeOverdueCounts || false;

			if (shouldRandomize && responseData.students) {
				console.log('Developer Mode: Randomizing overdue lesson counts');
				responseData.students.forEach(student => {
					if (student.hasOwnProperty('totalOverdueLessons')) {
						student.totalOverdueLessons = Math.floor(Math.random() * 100) + 1;
					}
				});
			}

			resolve(responseData);
		});
	});
}

/*
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
					window.alert('It appears you are not the homeroom teacher on this section and cannot access Overdue Lessons. \n\nLessons Behind will be used as the primary Lesson Completion Measure. This message will continue to popup until this setting is changed on the CHAT Settings page.');
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
		// import chatLedger
		let myStudentsPage = result.chatLedger[result.userSettings.school].myStudentsPage;
		console.log(myStudentsPage);
		console.log(myStudentsPage.measures.studentId);
		console.log(myStudentsPage.measures.overdueLessons);

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

		// Get the headers
		let headerCSS = document.querySelectorAll('[cx-html-compile="column.displayName"]');
		let headers = [].slice.call(headerCSS);

		// get the Student ID column
		let headerColIndex_ID = -1;
		headerColIndex_ID = headers.findIndex(header => {return header.innerText == myStudentsPage.measures.studentId.header}) + myStudentsPage.measures.studentId.columnOffset;
		
		// get the OD column
		let headerColIndex_overdue = -1;
		headerColIndex_overdue = headers.findIndex(header => {return header.innerText == myStudentsPage.measures.overdueLessons.header}) + myStudentsPage.measures.overdueLessons.columnOffset;

		if(headerColIndex_ID >= 0) {
			for(i=0; i<studentRows.length; i++){
				let studentCells = studentRows[i].querySelectorAll('td');
				let studentId = studentCells[headerColIndex_ID].innerText;
				let overdueLessonsString = studentCells[headerColIndex_overdue].innerText;
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
	});
}
*/
