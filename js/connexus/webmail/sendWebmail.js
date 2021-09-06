var storage = chrome.storage.local;
// message to background console
function bgConsole(sendCommand) {
	chrome.runtime.sendMessage({type: 'console', command: sendCommand});
}


// function to format dates to mm/dd/yyyy
function formatDate(date) {
	var dateString = date.toString();
	var splitDateString = dateString.split("-");
	return splitDateString[1] + "/" + splitDateString[2] + "/" + splitDateString[0];
}

storage.get(null, function(result) {

	var firstName = result.webmailStudentName;
	var loopCount = 0;
	bgConsole('attempting...');
	checkLoad();
	
	function checkLoad() {
		setTimeout(function() {
			if (checkElement() == false) {
				loopCount = loopCount + 1;
				bgConsole('check element returns false. Starting attempt #' + loopCount);
				if (loopCount <= 30) {
					checkLoad();
				} else {
					alert('It appears there is an issue with your internet connection. Please try again later!');
				}
			} else {
				var comment = document.getElementById('comment');
				var adjustmentsArray = result.timeAdjustments;
				var changesAlert = "";
				for(i=0;i<adjustmentsArray.length;i++) {
					changesAlert = changesAlert + adjustmentsArray[i] + "<br>";
				}
				var signature = document.getElementsByTagName("iframe")[0].contentDocument.getElementsByTagName("body")[0].innerHTML;
				var webMail = 'Dear ' + firstName + ',' + 
							'<br><br>' +
							'The school attendance system has made the following adjustments to your attendance between ' + result.globalStartDate + ' and ' + result.globalEndDate + '.' + '<br>' +
							changesAlert + "<br>" + 
							'These changes were calculated based on the amount of work submitted between these dates. Our records show the following work was completed: ' + '<br>' +
							result.studentLessons + "<br>" + 
							result.studentAssessments + "<br> <br>" +
							'If you have any information as to why these adjustments may be incorrect, please reply to this WebMail as soon as possible.'  + 
							signature;
				document.getElementsByTagName("iframe")[0].contentDocument.getElementsByTagName("body")[0].innerHTML = webMail;
				alert("Please be aware that this WebMail will be sent directly to families. You are highly encouraged to add more based upon the situation.");
				//prompt("If the WebMail does not automatically populate, copy to clipboard with Ctrl+C", webMailCopy);
			}
			function checkElement() {
				var status = true;
				bgConsole('checking for the element...');
				try {
					document.getElementsByTagName("iframe")[0].contentDocument.getElementsByTagName("body")[0].innerHTML;
					bgConsole('webmail body loaded');
				} catch(err) {
					bgConsole('element not loaded...');
					status = false;
				}
				return status;
			}
		},1000);
	}
});
