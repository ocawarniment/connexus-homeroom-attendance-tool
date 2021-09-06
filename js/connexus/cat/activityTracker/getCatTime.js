
checkLoaded();

function getCatTime(){
    var results = {};

    // get dates
    const dateRange = document.querySelector('h2.ng-binding').innerText;
    var startDateStr = dateRange.split(" - ")[0];
    var endDateStr = dateRange.split(" - ")[1];
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    var daysBetween = (endDate.getTime()-startDate.getTime())/(1000*24*3600);

    var catDates = [];
    for(var i = 0; i<=daysBetween; i++){
        var loopDate = new Date();
        loopDate.setTime(startDate.getTime()+i*(1000*24*3600));
        var loopDateString = formatDate(loopDate).toString();
        results[loopDateString] = {date: loopDateString, courseTime: null};
    }
    // loop through days
    const courseRows = document.querySelectorAll('tr[ng-repeat*="activity"]');
    const courseNameCells = document.querySelectorAll('th.course-name');
    var courseNames = [];
    courseNameCells.forEach(nameCell => {courseNames.push(nameCell.innerText)});
    var col=0;
    // loop through rows
    Object.keys(results).forEach(date => {
        // loop through the courseRows
        var dayTimeArr = [];
        var row=0;
        courseRows.forEach(courseRow => {
            // only get the current day column
            // check if it is an input
            var timeStr = null;
            var timeCell = courseRow.querySelectorAll('td')[col];
            if(timeCell.children[0].tagName.toLowerCase() == 'input') {
                if(courseRow.querySelectorAll('td')[col].children[0].value !== '') {
                    timeStr = hhmmToHMin(courseRow.querySelectorAll('td')[col].children[0].value);
                }
            } else {
                if(courseRow.querySelectorAll('td')[col].children[0].innerText !== '') {
                    var rawStr = courseRow.querySelectorAll('td')[col].children[0].innerText;
                    var min = rawStr.match(/\d+(?= min)/g) || 0;
                    var hr = rawStr.match(/\d+(?= hr)/g) || 0;
                    timeStr = `${hr}h ${min}min`;
                } 
            }
            // if time is present for cell
            if(timeStr !== null) { dayTimeArr.push({course: courseNames[row], time: timeStr});}
            row++;
        })
        results[date].courseTime = dayTimeArr;
        col++;
    })

    chrome.storage.local.set({catTime: results});
    // send the message to finish the job
    chrome.runtime.sendMessage({type: 'loadCatTime', closeSender: true});
}

function formatDate(date) {
    return (date.getMonth() + 1) + '/' + date.getDate() + '/' +  date.getFullYear();
}

function hhmmToHMin(hhmm){
    // convert time to string HH:MM
    const hours = parseInt(hhmm.match(/\d+(?=:)/g))
    const mins = parseInt(hhmm.match(/(?<=:)\d+/g));
    return `${hours}h ${mins}min`;
}

function checkLoaded() {
    // check if its ready
    if(document.querySelector('.cxPrimaryBtn') === null) {
        // wait 2 seconds and try again
        setTimeout((function(){ checkLoaded(); }), 2000);
    } else {
        //clearAllTime();
        getCatTime();
    }
}