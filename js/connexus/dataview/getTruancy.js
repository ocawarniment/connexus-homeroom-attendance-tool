/////////////
var storage = chrome.storage.local;
// message to background console
let bgConsole = {
	log: function(value) {
		chrome.runtime.sendMessage({type: 'log', value: value});
	}
}

getTruancy();

function getTruancy(){
	chrome.storage.local.get(null, result => {
		// check that the page is accessible
		if(location.href.match(/Access\+Denied/g) == null) {
			let homeroomArray = result.students;
			// get student ID from URL
			let studentId = location.href.match(/(?<=idWebuser=).*/g)[0];
			// get the metrics to search for
			let studentMeasures = result.chatLedger[result.userSettings.school].truancyDataView.measures;
			// loop all metrics
			let measureTitles = Object.keys(studentMeasures);
			measureTitles.forEach(measureTitle => {
				let measure = studentMeasures[measureTitle];
				try{
					console.log(`storing measure: ${measureTitle}`);
					// try to get the value two ways
					//let defaultValue = metric.defaultValue || null;
					let defaultValue = 'defaultValue' in measure ? measure.defaultValue : null;
					let cssSelector = measure.domSelector;
					let element = document.querySelector(`${measure.domSelector.toString()}`);
					let elementInnerText = element?.innerText || "";
					let elementValue = element?.value || "";
					//console.log(element);
					// try inner text
					if(elementInnerText) {
						homeroomArray[`ST${studentId}`][measureTitle] = elementInnerText;
						//console.log('inner text', elementInnerText)
					} else if(elementValue) {
						homeroomArray[`ST${studentId}`][measureTitle] = elementValue;
						//console.log('value', elementValue);
					} else {
						// try fallback defaultVal
						homeroomArray[`ST${studentId}`][measureTitle] = defaultValue || null;
					}
					// cleanup vals
					// if val is #VALUE try and overwrite with defaultValue if it exists
					homeroomArray[`ST${studentId}`][measureTitle] == '#VALUE!' && defaultValue !== null ? homeroomArray[`ST${studentId}`][measureTitle] = defaultValue : false;
					// force correct type if it set
					if(measure.type == 'number') { homeroomArray[`ST${studentId}`][measureTitle] = Number(homeroomArray[`ST${studentId}`][measureTitle]) }
					else if(measure.type == 'string') { homeroomArray[`ST${studentId}`][measureTitle] = homeroomArray[`ST${studentId}`][measureTitle].toString() }
				} catch(err) {
					//bgConsole(`Error getting ${measureTitle} for ${studentID}`)
					homeroomArray[`ST${studentId}`][measureTitle] = defaultValue || null;
				}
				// if null, try to set the fefault val
				homeroomArray[`ST${studentId}`][measureTitle] == null && measure.defaultValue !== undefined ? homeroomArray[`ST${studentId}`][measureTitle] = measure.defaultValue : false;
			})

			// calculate studentMetrics
			let studentMetrics = result.chatLedger[result.userSettings.school].truancyDataView.metrics;
			let metricTitles = Object.keys(studentMetrics);
			console.log(studentMetrics);
			// loop each metric and calculate it
			metricTitles.forEach(metricTitle => {
				let metric = studentMetrics[metricTitle];
				console.log(`storing metric: ${metricTitle}`);
				bgConsole.log(`Metric calc (${metricTitle}) for student ${studentId}: ${metric}`)
				bgConsole.log(JSON.stringify(metric));
				// do the calculatioon
				let result = null;
				if(metric.operation == 'add') {
					result = homeroomArray[`ST${studentId}`][metric.measureOne] + homeroomArray[`ST${studentId}`][metric.measureTwo];
				} else if (metric.operation == 'subtract') {
					result = homeroomArray[`ST${studentId}`][metric.measureOne] - homeroomArray[`ST${studentId}`][metric.measureTwo];
				} else if (metric.operation == 'multiply') {
					result = homeroomArray[`ST${studentId}`][metric.measureOne] * homeroomArray[`ST${studentId}`][metric.measureTwo];
				} else if (metric.operation == 'divide') {
					result = homeroomArray[`ST${studentId}`][metric.measureOne] / homeroomArray[`ST${studentId}`][metric.measureTwo];
				} 
				homeroomArray[`ST${studentId}`][metricTitle] = Math.round(result*100)/100;
			})

			// set the extra val
			//homeroomArray[`ST${studentId}`].lessonTimeAlignment = -1 * homeroomArray[`ST${studentId}`].lessonsBehind - homeroomArray[`ST${studentId}`].netHours;
			
			// all student vars are set; pass it back to storage
			storage.set({'students': homeroomArray});
			//chrome.runtime.sendMessage({type: 'getTruancy', first: false, completedID: studentId});
			chrome.runtime.sendMessage(result, function (response) {
				console.log(response); // Logs 'true'
			})

			window.close();
			
		} else {
			// skipp that student
			//chrome.runtime.sendMessage({type: 'getTruancy', first: false, completedID: studentId});
			chrome.runtime.sendMessage(result, function (response) {
				console.log(response); // Logs 'true'
			})
			bgConsole.log('error');
			//window.close();
		}
	})
}

function getTru(){
	storage.get(null, (result) => {
		var homeroomArray = result.students;
		var studentID = result.truancyID;
		// dynamically get ALL from the schoolVars
		let studentMetrics = result.schoolVars.truancyDataView.measures;
		let metricTitles = Object.keys(studentMetrics);
		metricTitles.forEach(metricTitle => {
			try{
				let metric = studentMetrics[metricTitle];
				// try to get the value two ways
				let cssSelector = metric.domSelector;
				bgConsole(cssSelector); 
				let element = document.querySelector(`${metric.domSelector.toString()}`);
				console.log(cssSelector, element);
				let elementInnerText = element?.innerText || "";
				let elementValue = element?.value || "";
				console.log(elementInnerText, elementValue);
				// try inner text
				if(elementInnerText) {
					homeroomArray[`ST${studentID}`][metricTitle] = elementInnerText;
				} else if(elementValue) {
					homeroomArray[`ST${studentID}`][metricTitle] = elementValue;
				} else {
					homeroomArray[`ST${studentID}`][metricTitle] = null;
				}
			} catch(err) {
				bgConsole(`Erro getting ${metricTitle} for ${studentID}`)
				homeroomArray[`ST${studentID}`][metricTitle] = null;
			}
			console.log(homeroomArray[`ST${studentID}`][metricTitle]);
		})
		// all student vars are set; pass it back to storage
		storage.set({'homeroomArray': homeroomArray});
		chrome.runtime.sendMessage({type: 'getTruancy', first: false, completedID: studentID});
		//window.close();
	})
}

function getTruancy_archived(){
	// download truancy
	storage.get(null, function(result) {
		var homeroomArray = result.homeroomArray;
		var studentID = result.truancyID;
		
		try{
			// temp FORCE scrape caButton_ok
			//var error = document.getElementById('caButton_ok').innerText;
			// original replace after fix
			var error = document.getElementById('pageTitleHeaderTextSpan').innerText;
			alert("This student does not have an active Truancy Tracking Data View. Please click OK to continue.");
			homeroomArray['ST' + studentID]['lastLogin'] = "N/A";
			homeroomArray['ST' + studentID]['lastContact'] = "N/A";
			homeroomArray['ST' + studentID]['missingHours'] = "N/A";
			homeroomArray['ST' + studentID]['gapDate'] = "N/A";
			
		} catch(err){
				
				var totalMissingHours; //EF_StudentLastSynchronousContact
				var totalApproved = document.getElementById(result.schoolVars.truancy.totalApproved.toString()).innerText;
				var totalRequired = document.getElementById(result.schoolVars.truancy.totalRequired.toString()).innerText;
				totalMissingHours = document.getElementById(result.schoolVars.truancy.missingHours.toString()).innerText;
				
				//var overdue;
				//overdue = document.getElementById('EF_NumberLessonsBehind').innerText * 1;
				//if (overdue == "#VALUE!" || overdue == "") {overdue = 0}
				//homeroomArray['ST' + studentID]['overdue'] = overdue;
				//studentArray['overdue'] = studentOverdue;
				
				var lastLogin;
				lastLogin = document.getElementById(result.schoolVars.truancy.lastLogin.toString()).innerText.trim();
				if (lastLogin == "#VALUE!" || lastLogin == "" || lastLogin == null) {lastLogin = "-"}
				homeroomArray['ST' + studentID]['lastLogin'] = lastLogin;
				
				var gapDate;
				gapDate = document.getElementById(result.schoolVars.truancy.gapDate.toString()).innerText.trim();
				if (gapDate == "#VALUE!" || gapDate == "" || gapDate == null) {gapDate = "-"}
				homeroomArray['ST' + studentID]['gapDate'] = gapDate;
				
				var lessonsBehind;
				lessonsBehind = document.getElementById(result.schoolVars.truancy.lessonsBehind.toString()).innerText.trim();
				if (lessonsBehind == "#VALUE!" || lessonsBehind == "" || lessonsBehind == null) {lessonsBehind = "-"}
				homeroomArray['ST' + studentID]['lessonsBehind'] = lessonsBehind;

				// get last contact
				var lastSyncContact;
				lastSyncContact = getExtendedField(result.schoolVars.truancy.lastContact.toString());
				// calc days since contact
				var today = new Date();
				var diff =  -1*(Math.floor(( Date.parse(lastSyncContact) - today) / 86400000) + 1); 
				// flow chart days since contact
				if (diff >= 14) { homeroomArray['ST' + studentID]['escalation'] = "Approaching Alarm" }
				if (diff >= 21) { homeroomArray['ST' + studentID]['escalation'] = "Alarm" };
				// set hover text
				homeroomArray['ST' + studentID]['escReason'] = "Last Contact: " + lastSyncContact;

				homeroomArray['ST' + studentID]['totalMissingHours'] = Math.round(100*(totalApproved - totalRequired))/100;
				//totalMissingHours = Math.round(100*(totalApproved - totalRequired))/100;
				// if hours are missing, calculate based on attendance metric and FDP
				/*
				if (totalMissingHours == "#VALUE!" || totalMissingHours == "") {
					var attendanceMetric = document.getElementById(result.schoolVars.truancy.attendanceMetric.toString()).innerText;
					attendanceMetric = parseFloat(attendanceMetric); // turn into float
					var firstDayString = document.getElementById(result.schoolVars.truancy.firstDay.toString()).innerText.trim();
					var firstDay = new Date(firstDayString);
					var daysEnrolled = (today-firstDay)/(1000 * 60 * 60 * 24);
					var weekDays = (daysEnrolled/7)*(-2) + daysEnrolled; // remove weekends... roughly
					var expectedHours = weekDays*5.5;
					// if attendane metric <1 then -1
					totalMissingHours = (attendanceMetric - 1)*expectedHours;
					totalMissingHours = Math.round(100*totalMissingHours)/100;
				} else {
					//window.alert(totalApproved + " | " + totalRequired);
					totalMissingHours = Math.round(100*(totalApproved - totalRequired))/100
				};
				*/
				//homeroomArray['ST' + studentID]['totalMissingHours'] = totalMissingHours;
				//homeroomArray['ST' + studentID]['test'] = 'dunno';

				// IF AND ONLY IF OCA MODE
				if(result.school == 'oca') {
					// check CCP
					var ccpEle = document.getElementById(result.schoolVars.truancy.ccpHours.toString());
					var ccpHrs = null;
					if(ccpEle.nodeName.toLowerCase() == 'input') {
						ccpHrs = ccpEle.value;
						//homeroomArray['ST' + studentID]['cte'] = cteEle.value; 
					} else {
						ccpHrs = ccpEle.innerText;
						//homeroomArray['ST' + studentID]['cte'] = cteEle.innerText;
					}
					if(ccpHrs == '0' || ccpHrs == 0 || ccpHrs =='') {
						homeroomArray['ST' + studentID]['ccp'] = false;
					}

					// check CTE
					var cteEle = document.getElementById(result.schoolVars.truancy.cteHours.toString());
					var cteHrs = null;
					if(cteEle.nodeName.toLowerCase() == 'input') {
						cteHrs = cteEle.value;
						//homeroomArray['ST' + studentID]['cte'] = cteEle.value; 
					} else {
						cteHrs = cteEle.innerText;
						//homeroomArray['ST' + studentID]['cte'] = cteEle.innerText;
					}
					if(cteHrs == '0' || cteHrs == 0 || cteHrs =='') {
						homeroomArray['ST' + studentID]['cte'] = false;
					}
				} else {
					homeroomArray['ST' + studentID]['ccp'] = false;
					homeroomArray['ST' + studentID]['cte'] = false;
				}

				
				/*
				var ccp = document.getElementById(result.schoolVars.truancy.ccpStudent.toString()).innerText;
				if(ccp !== ''){
					var ccpEle = document.getElementById(result.schoolVars.truancy.ccpHours.toString());
					console.log(ccpEle);
					if(ccpEle.nodeName.toLowerCase() == 'input' || ccpEle.nodeName.toLowerCase() == 'text') {
						homeroomArray['ST' + studentID]['ccp'] = ccpEle.value; 
					} else {
						homeroomArray['ST' + studentID]['ccp'] = ccpEle.innerText;
					}
				} else {
					homeroomArray['ST' + studentID]['ccp'] = false;
				}
				*/

				// test state ID
				//homeroomArray['ST' + studentID]['stateId'] =  document.getElementById(result.schoolVars.truancy.stateId.toString()).innerText;

				// debug and testing color coding
				//overdue = "26";
				//lastLogin = 8/10/2018;
				//totalMissingHours = "15";
				//homeroomArray['ST' + studentID]['overdue'] = overdue;
				//homeroomArray['ST' + studentID]['lastLogin'] = lastLogin;
				
				storage.set({'homeroomArray': homeroomArray});
				storage.set({'truancyLoading': false});
		}
		
		chrome.runtime.sendMessage({type: 'getTruancy', first: false, completedID: studentID});
		window.close();
	});
}


function getExtendedField(name) {
	var value;
	value = document.getElementById(name).innerText;
	return value;
}
