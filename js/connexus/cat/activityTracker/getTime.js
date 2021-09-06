checkLoaded();

function getTime() {
    var time = {};
    var attenTable = document.querySelector('table[name="vm.timeGrid"] > tbody');
    // get all the courses
    var courses = attenTable.querySelectorAll('.course-name');
    //var coursesObj = {};
    //courses.forEach(course => {coursesObj[course.innerText] = 0;})
    // get all the dates
    var dates = attenTable.querySelectorAll('.date-header>th:not(.total-label)');
    // get time rows
    var entries = attenTable.querySelectorAll('tr.ng-scope');
    var col = 0;
    var row = 0;
    // loop the table and convert to JSON
    dates.forEach(date => {
        // get date string
        var dateString = date.innerText;
        // get the courses and add the time
        var dayAttend = {};
        // loop the courses
        entries.forEach(course => {
            var courseName =course.querySelector('.course-name').innerText;
            var loggedTime = 0; 
            try{ loggedTime = course.querySelectorAll('td.ng-scope')[col].querySelector('input').value } catch(err) {};
            dayAttend[courseName] = loggedTime;
        });
        time[dateString] = dayAttend;
        col++;
    });  
    console.log(time);
    return time;
}

function clearAllTime(){
    var attenTable = document.querySelector('table[name="vm.timeGrid"] > tbody');
    var dates = attenTable.querySelectorAll('.date-header>th:not(.total-label)');
    var entries = attenTable.querySelectorAll('tr.ng-scope');
    var col = 0;
    // loop the table and convert to JSON
    dates.forEach(date => {
        // get date string
        var dateString = date.innerText;
        // get the courses and add the time
        var dayAttend = {};
        // loop the courses
        entries.forEach(course => {
            try{ 
                var timeBox = course.querySelectorAll('td.ng-scope')[col].querySelector('input');
                if(timeBox.value !== '') {
                    timeBox.value = '00:00';
                    timeBox.dispatchEvent(new Event('change'));
                }
            } catch(err) {
                // nothing
            };
        });
        col++;
    });
}

function checkLoaded() {
    console.log('running checkLoaded');
    console.log(document.querySelector('table[name="vm.timeGrid"] > tbody'));
    // check if its ready
    if(document.querySelector('table[name="vm.timeGrid"] > tbody') === null) {
        console.log('scheduling checkLoaded for 2 sec');
        // wait 2 seconds and try again
        setTimeout((function(){ console.log('running scheduled Check loaded'); checkLoaded(); }), 2000);
    } else {
        console.log('running get time; its loaded');
        getTime();
        clearAllTime();
    }
}