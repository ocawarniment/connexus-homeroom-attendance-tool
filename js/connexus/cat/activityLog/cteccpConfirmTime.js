// send message to report to make the change
//const url = location.href;
const course = url.match(/(ccp|cte)/g)[0];
const time = document.querySelector('#btnApprove').getAttribute('time'); //url.match(/(?<=(ccp|cte)\=)[^\&]+/g)[0];
const autoString = "auto=saveandreload&course=" + course + "&time=" + time;

// get the adj string
const regex = /(cte|ccp)=([\d.])+/g;
const adjustString = url.match(regex) + "&approve=true";

var cteccpAdjustBtn = document.querySelector('#btnApprove');
cteccpAdjustBtn.value = "Approve " + course.toUpperCase();
cteccpAdjustBtn.type = "button";
cteccpAdjustBtn.disabled = false;
cteccpAdjustBtn.setAttribute('class','cxBtn');
cteccpAdjustBtn.setAttribute('displayed','true');
cteccpAdjustBtn.setAttribute('style','border: 1px solid #128E10;color:  #fff;text-shadow: 0 0 2px #010c24; background: #FC6C5D; background-image: linear-gradient(#4FD24D, #2DA72B);');



					