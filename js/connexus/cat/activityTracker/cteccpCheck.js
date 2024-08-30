//checkLoaded();

checkLoaded();

function checkCteCcpTime(){
    // get time from URL
    // dailyHours is set in background
    dailyHours = dailyHours * 1;
    // convert dailyHours to HH:MM
    const dailyMins = dailyHours * 60;

    // convert time to string HH:MM
    const fullHours = Math.floor(dailyMins/60);
    const fullMins = Math.round((dailyMins/60 - fullHours) * 60);
    const timeString = ("00" + fullHours).slice(-2) + ':' + ("00" + fullMins).slice(-2);

    // get the startDate to determine when to add days aligned with calendar
    const url = location.href;
    var regexStart = /(?<=startDate\=)[\d\-]+/g;
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
        var loopDateString = formatDate(loopDate);
        catDates.push(loopDateString);
    }

    // find the correct course item
    const courses = document.querySelectorAll('th.course-name');
    var courseRow = null;
    courses.forEach(course => {
        if(course.innerText.toLowerCase() == adjType){
            // this is the course
            courseRow = course.parentElement;
       }
    })

    // if we cant find the course, they're not enrolled
    if(courseRow !== null) {
        // set the correct course inputs
        var i=0;
        const courseDays = courseRow.querySelectorAll('input');
        const courseDayCells = courseRow.querySelectorAll('td');
        
        // prep the results obj
        var correct = true;

        chrome.storage.local.get(null, (result) => {
            var totalCells = document.querySelector('.time-total').querySelectorAll('th.ng-scope');
            var schoolCal = result.chatLedger[result.userSettings.school].calendar;//result.schoolVars.calendar;
            courseDayCells.forEach(courseDayCell => {
                var day = courseDayCell.children[0];
                var childType = courseDayCell.children[0].nodeName.toLowerCase();
                // check if each catDate are in the school calendar
                if(schoolCal.includes(catDates[i]) && childType == 'input'){
                    // get currentTimeStr; excessTimeStr
                    var currentTimeStr = totalCells[i].querySelectorAll('span')[0].innerText;
                    var excessTimeStr = totalCells[i].querySelectorAll('span')[1].innerText;
                    console.log(catDates[i] + ": " + day.value + " | expect: " + timeString);
                    // check that the time string matches - CHECK WITH TIME CALCS (expectedDec, currentTimeStr, excessTimeStr, currentCellVal)
                    var expectedTimeStr = getAdjReq(dailyHours, currentTimeStr, excessTimeStr, day.value);
                    var actualTimeStr = "00:00"; 
                    if(day.value !== '') {actualTimeStr=day.value;}
                    console.log(`Actual: ${actualTimeStr} | Expect: ${expectedTimeStr}`);
                    if(actualTimeStr !== expectedTimeStr) { console.log('mistake'); correct = false; }
                } else if(childType == 'input') {
                    console.log(catDates[i] + ": " + day.value + " | expect: hh:mm");
                    // shouldnt have time check that it is hh:mm
                    if(day.value !== '') { console.log('mistake'); correct = false; }
                }
                i++;
            })
            // send to background to alert the activies log tab
            chrome.runtime.sendMessage({type: 'cteccpAlertResults', correct: correct, time: timeString});
        })
    } else {
        // close it down
        chrome.runtime.sendMessage({type: 'closeTab'});
    }
}

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
    chrome.runtime.sendMessage({type: 'loadCatTime', closeSender: false});
}

function checkLoaded(retries = 0, maxRetries = 50) {
    console.log(document.querySelector('table[name="vm.timeGrid"] > tbody'));
    
    if (retries >= maxRetries) {
        console.error('Max retries reached. Element not found.');
        return;
    }
    
    // check if it's ready
    if (document.querySelector('.cxPrimaryBtn') === null) {
        // wait 500 milliseconds and try again
        setTimeout(() => checkLoaded(retries + 1, maxRetries), 500);
    } else {
        window.alert('GOT');
        getCatTime();
        checkCteCcpTime();
    }
}


/*
function checkLoaded() {
    console.log(document.querySelector('table[name="vm.timeGrid"] > tbody'));
    // check if its ready
    if(document.querySelector('.cxPrimaryBtn') === null) {
        // wait 2 seconds and try again
        setTimeout((function(){ checkLoaded(); }), 100);
    } else {
        window.alert('GOT');
        getCatTime();
        checkCteCcpTime();
    }
}
*/

function formatDate(date) {
    return (date.getMonth() + 1) + '/' + date.getDate() + '/' +  date.getFullYear();
}

function decToTime(timeDec){
    // convert time to string HH:MM
    const hours = Math.floor(timeDec);
    const mins = Math.round((timeDec - hours) * 60);
    return ("00" + hours).slice(-2) + ':' + ("00" + mins).slice(-2);
}

function timeToDec(hhmm){
    // convert HH:MM to dec
    const hours = parseInt(hhmm.match(/\d+(?=:)/g))
    const mins = parseInt(hhmm.match(/(?<=:)\d+/g));
    return hours + mins/60;
}

function getAdjReq(expectedDec, currentTimeStr, excessTimeStr, currentCellVal) {
    var adjReq = expectedDec;
    var i=0;
    var changes = [];
        var currentDec = (currentTimeStr.match(/\d+(?= hr)/g) || 0)*60 + (currentTimeStr.match(/\d+(?= min)/g) || 0)*1;
        var excessDec = (excessTimeStr.match(/\d+(?= hr)/g) || 0)*60 + (excessTimeStr.match(/\d+(?= min)/g) || 0)*1;
        console.log(`Day ${i} | ${currentTimeStr}=${currentDec} | ${excessTimeStr}=${excessDec}`);

        if(currentTimeStr == '0 mins' || currentTimeStr == '') {var current=false;} else {var current=true;}
        if(excessTimeStr == '0 mins' || excessTimeStr.charAt(0) == '-' || excessTimeStr == '') {var excess=false;} else {var excess=true;}

        // calc based on bools
        var totalTimeDec = 0;
        console.log(`${current} | ${excess}`);
        if(current && excess) { totalDec = (currentDec - excessDec)/60; }
        if(current && !excess) { totalDec = currentDec/60; }
        if(!current) { totalDec = 0 }
        // adjust based on whats in the CCP cell already
        console.log(`Total Time Pre Adj: ${totalDec}`);
        if(currentCellVal !== '') {totalDec = totalDec - timeToDec(currentCellVal)};
        console.log(`Total Time: ${totalDec}`);
        
        if(expectedDec + totalDec > 10) {
            // set back to the timeString
            adjReq = 10 - totalDec;
        }
    return decToTime(adjReq);
}

function hhmmToHMin(hhmm){
    // convert time to string HH:MM
    const hours = parseInt(hhmm.match(/\d+(?=:)/g))
    const mins = parseInt(hhmm.match(/(?<=:)\d+/g));
    return `${hours}h ${mins}min`;
}