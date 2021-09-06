console.log('here');
// check for automations: course; time; auto;
const url = location.href;
const query = location.search;
let auto, course, time, baseQuery;
try{ 
    auto = url.match(/(?<=auto\=)[\w]+/g)[0]; 
    course = url.match(/(?<=course\=)[\w]+/g)[0];
    time = url.match(/(?<=time\=)[\d\.]+/g)[0];
    baseQuery = query.match(/.*(?=\&auto)/g)[0];
} catch(err) { /* do nothing */ }

if(auto == 'approve') {
    chrome.runtime.sendMessage({type: 'cteccpAdjust', dailyHours: time, adjType: course, baseQuery: baseQuery, callback: 'approve'});
}
if(auto == 'edit') {
    chrome.runtime.sendMessage({type: 'cteccpAdjust', dailyHours: time, adjType: course, baseQuery: baseQuery, callback: 'none'});
}
if(auto == 'saveandreload') {
    chrome.runtime.sendMessage({type: 'cteccpAdjust', dailyHours: time, adjType: course, baseQuery: baseQuery, callback: 'reload'});
}
if(auto == 'check') {
    console.log('sending message to back to check');
    chrome.runtime.sendMessage({type: 'cteccpCheck', dailyHours: time, adjType: course, baseQuery: baseQuery, approve: false});
}
if(auto == 'getCourses') {
    chrome.runtime.sendMessage({type: 'getCatTime'});
}

/*
// check if url has query params
try{

    var url = window.location.href;
    const fullRegex = /(cte|ccp)=([\d.])+/g;
    const adjustString = url.match(fullRegex)[0];

    // get the adjustment type
    const typeRegex = /.*(?=\=)/g;
    const type = adjustString.match(typeRegex)[0];

    // get the hours string
    const hoursRegex = /(?<=(cte|ccp)=)[\d\.]+/g;
    const hours = adjustString.match(hoursRegex)[0];

    // get the url params for return
    const query = location.search;
    const regex = /.*(?=\&(cte|ccp))/g;
    const baseQuery = query.match(regex)[0];

    // check if we should approve
    const approve = query.includes("&approve=true") ? true : false;

    if(type == "cte" | type == "ccp"){
        chrome.runtime.sendMessage({type: 'cteccpAdjust', dailyHours: hours, adjType: type, baseQuery: baseQuery, approve: approve});
    }

    // 3 automations: edit, approve, check
    const autoType = query.match(/(?=auto\=)[\c(?!\&)]+/g)[0]
} catch(err) {
    // do nothing
}
*/
