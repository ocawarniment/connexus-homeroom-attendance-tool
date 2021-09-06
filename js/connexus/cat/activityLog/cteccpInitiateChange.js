// send message to report to make the change
//const url = location.href;
const course = url.match(/(ccp|cte)/g)[0];
const time = document.querySelector('#btnApprove').getAttribute('time'); //url.match(/(?<=(ccp|cte)\=)[^\&]+/g)[0];
const autoString = "auto=saveandreload&course=" + course + "&time=" + time; // get timeVal from the other global set in activitiesLog.js

// add button to clean CAT
const startDateRaw = document.querySelector('#startDate').value;
const endDateRaw = document.querySelector('#endDate').value;
startDate = startDateRaw.split("/")[2] + "-" + startDateRaw.split("/")[0] + "-" + startDateRaw.split("/")[1];
endDate = endDateRaw.split("/")[2] + "-" + endDateRaw.split("/")[0] + "-" + endDateRaw.split("/")[1];

// final url to edit
var editUrl = "https://www.connexus.com/activitytracker/default/weeksummary?idWebuser=" + url.match(/(?<=idWebuser\=)[\d]+/g)[0] + "&startDate=" + startDate + "&endDate=" + endDate + "&" + autoString;

// get the adj string
const regex = /(cte|ccp)=([\d.])+/g;
const adjustString = url.match(regex) + "&approve=true";

//&startDate=2020-08-30&endDate=2020-09-05
var adjustUrl = "https://www.connexus.com/activitytracker/default/weeksummary?idWebuser=" + url.match(/(?<=idWebuser\=)[\d]+/g)[0] + "&startDate=" + startDate + "&endDate=" + endDate + "&" + adjustString;

var cteccpAdjustBtn = document.createElement("input");
cteccpAdjustBtn.id = "btnAdjust";
cteccpAdjustBtn.value = "Adjust " + course.toUpperCase();
cteccpAdjustBtn.type = "button";
cteccpAdjustBtn.setAttribute('time', time);
cteccpAdjustBtn.setAttribute('class','cxBtn');
cteccpAdjustBtn.setAttribute('displayed','true');
cteccpAdjustBtn.setAttribute('style','border: 1px solid #CB2312;color:  #fff;text-shadow: 0 0 2px #010c24; background: #FC6C5D; background-image: linear-gradient(#FC6C5D, #EE4B3B);');
cteccpAdjustBtn.onclick = function(){
    var submit = window.confirm("This student is enrolled in CTE or CCP and does not have the correct time logged for the week. Attendance cannot be approved until this matches up. \n\nExpected Hours: " + time +"\n\nWould you like to set the correct attendance hours for each school day in this attendance window?");
    if(submit) {chrome.runtime.sendMessage({type: 'openPage', url: editUrl, focused: true, closeSender: true});}
};
document.querySelector('.formFields').appendChild(cteccpAdjustBtn);
document.querySelector('#btnApprove').style.display = "none";

					