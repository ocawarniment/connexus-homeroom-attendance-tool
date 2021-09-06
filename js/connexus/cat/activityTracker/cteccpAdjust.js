checkLoaded();

function clearAllTime(){
    var attenTable = document.querySelector('table[name="vm.timeGrid"] > tbody');
    var dates = attenTable.querySelectorAll('.date-header>th:not(.total-label)');
    var entries = attenTable.querySelectorAll('tr.ng-scope');
    var col = 0;
    var entryCells = document.querySelectorAll('input[placeholder="hh:mm"]');
    entryCells.forEach(cell => {
        cell.value = 0;
        cell.dispatchEvent(new Event('change'));
    });
}

function setCteCcpTime(){
    // get time from URL
    // approve is set in the background
    // dailyHours is set in background
    dailyHours = dailyHours * 1;
    // convert dailyHours to HH:MM
    const dailyMins = dailyHours * 60;

    // convert time to string HH:MM
    const fullHours = Math.floor(dailyMins/60);
    const fullMins = Math.round((dailyMins/60 - fullHours) * 60);
    var timeString = ("00" + fullHours).slice(-2) + ':' + ("00" + fullMins).slice(-2);

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
    var courseRow;
    courses.forEach(course => {
        if(course.innerText.toLowerCase() == adjType){
            // this is the course
            courseRow = course.parentElement;
       }
    })

    // set the correct course inputs
    var i=0;
    //const courseDays = courseRow.querySelectorAll('input');
    const courseDayCells = courseRow.querySelectorAll('td');
    var changes = [];
    chrome.storage.local.get(null, (result) => {
        var totalCells = document.querySelector('.time-total').querySelectorAll('th.ng-scope');
        var schoolCal = result.chatLedger[result.userSettings.school].calendar;
        courseDayCells.forEach(courseDayCell => {
            var day = courseDayCell.children[0];
            var childType = courseDayCell.children[0].nodeName.toLowerCase();
            var before = day.value || '00:00';
            // check if each catDate are in the school calendar
            if(schoolCal.includes(catDates[i]) && childType == 'input'){
                var currentTimeStr = totalCells[i].querySelectorAll('span')[0].innerText;
                var excessTimeStr = totalCells[i].querySelectorAll('span')[1].innerText;
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
                if(day.value !== '') {totalDec = totalDec - timeToDec(day.value)};
                console.log(`Total Time: ${totalDec}`);
                
                if(dailyHours + totalDec > 10) {
                    // set back to the timeString
                    var adjDayReqDec = 10 - totalDec;
                    console.log(`10-total=${adjDayReqDec}`)
                    var adjTimeStr = decToTime(adjDayReqDec);
                    console.log(adjTimeStr);
                    day.value = adjTimeStr;
                    day.dispatchEvent(new Event('change'));
                } else {
                    day.value = timeString;
                    day.dispatchEvent(new Event('change'));
                }
            } else {
                // shouldnt have time; non-school day
                day.value = '00:00';
                day.dispatchEvent(new Event('change'));
            }
            var after = day.value;
            if(before!==after){changes.push(catDates[i] + "  |  (" + before + ") => (" + after + ")")}
            i++;
        })

        console.log(changes);

        
        // click save
        var checkExist = setInterval(function() {
            if (document.querySelector('.cxPrimaryBtn').disabled == false) {
                document.querySelector('.cxPrimaryBtn').click();
                clearInterval(checkExist);
                if(callback == 'approve') {
                    chrome.runtime.sendMessage({type: 'activityLogOpenAndSave', attendanceParams: baseQuery});
                    window.close();
                } else if(callback == 'reload') {
                    chrome.runtime.sendMessage({type: 'activityLogOpen', attendanceParams: `${baseQuery}&${adjType}=${dailyHours}`, changes: changes});
                    window.close();
                }
            } else {
                console.log(document.querySelector('.cxPrimaryBtn').disabled);
            }
        }, 100); // check every 100ms
        
        
    })
    
}

function checkLoaded() {
    console.log(document.querySelector('table[name="vm.timeGrid"] > tbody'));
    // check if its ready
    if(document.querySelector('.cxPrimaryBtn') === null) {
        // wait 2 seconds and try again
        setTimeout((function(){ checkLoaded(); }), 2000);
    } else {
        //clearAllTime();
        setCteCcpTime();
    }
}

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

