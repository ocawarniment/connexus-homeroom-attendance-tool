async function loadChromeStorage() {
    console.log('loading from storage');
    // CryptoJS
    var cryptoPass = "oca2018";
    // surface chromestorag vals to the window
    chrome.storage.local.get(null, result => {
        console.log(result);
        window.chatData.students = result.students;
        window.chatData.schoolLedger = result.chatLedger[result.userSettings.school];
        window.chatData.userSettings = result.userSettings;
    })
    dataLayer.push({'event':'storage-js-loaded'});
}



/*
let schoolVars = {
    "name":"oca", 
    "truancyDataView": {
      "id": "14661",
      "measures": {
          "lastLogin": {"name":"Last Login", "domSelector":"#EF_LastLogin"},
          "lastContact": {"name":"Last Contact", "domSelector":"#EF_StudentLastSynchronousContact"},
          "netHours": {"name":"Hours Missed Year to Date", "domSelector":"#OCA_Truancy2122_HrsMissedYTD", "defaultValue":0},
          "gapDate": {"name":"Last Day with Approved Attendance", "domSelector":"#OCA_LastDayWUnapprovedAttend"},
          "totalApproved": {"name":"Actual Attendance Hours", "domSelector":"#OCA_Truancy2122_ActualAttHrs"},
          "totalRequired": {"name":"Required Attendance Hours", "domSelector": "#OCA_Truancy2122_ReqInstrucHrs"},
          "lessonsBehind": {"name":"Lessons Behind", "domSelector":"#EF_NumberLessonsBehind"},
          "attendanceMetric": {"name":"Attendance Metric", "domSelector":"#EF_AttendanceMetric"},
          "firstDay": {"name":"Enrollment Date", "domSelector":"#EF_EnrollmentDate"},
          "cteStudent": {"name": "Enrolled in CTE", "domSelector":"#EnrolledinCTECourse_2122"},
          "ccpStudent": {"name": "Enrolled in CCP", "domSelector":"#EnrolledInCollege_2122"},
          "cteHours": {"name": "CTE Hours Per Day", "domSelector":"#Ohio_Truancy2122_CTECATHrsDay"},
          "ccpHours": {"name": "CCP Hours Per Day", "domSelector":"#Ohio_Truancy2122_CCPCATHrsDay"},
          "stateId": {"name": "Student State ID", "domSelector":"#Student_ID"}
      }
    },
    "popupDisplay": [
      {"field":"id", "displayName":"ID", "default": true},
      {"field":"name", "displayName": "Student", "default": true},
      {"field":"approveButton", "displayName": "Attendance", "default": true},
      {"field":"lastLogin", "displayName": "Last Login", "default": true},
      {"field":"lastContact", "displayName": "Last Contact", "default": true},
      {"field":"attendanceMetric", "displayName":"Attendance Metric", "default": true},
      {"field":"attendanceStatus", "displayName":"Attendance Status", "default": true},
      {"field":"ccpHours", "displayName":"CCP Req Hrs/Day", "default": false},
      {"field":"ccpStudent", "displayName":"CCP Student?", "default": false},
      {"field":"cteHours", "displayName":"CTE Req Hrs/Day", "default": false},
      {"field":"cteStudent", "displayName":"CTE Student?", "default": false},
      {"field":"escReason", "displayName":"Escelation Reason", "default": false},
      {"field":"escelation", "displayName":"Escelation Status", "default": false},
      {"field":"firstDay", "displayName":"First Day", "default": false},
      {"field":"gapDate", "displayName":"Attendance Gap Date", "default": true},
      {"field":"lastContact", "displayName":"Last Sync. Contact", "default": false},
      {"field":"lastLogin", "displayName":"Last Login", "default": false},
      {"field":"lessonsBehind", "displayName":"Lessons Behind", "default": false},
      {"field":"netHours", "displayName":"Missing Hours YTD", "default": false},
      {"field":"stateId", "displayName":"State ID", "default": false},
      {"field":"totalApproved", "displayName":"Approved Hours YTD", "default": false},
      {"field":"totalRequired", "displayName":"Required Hours YTD", "default": false},
      {"field":"lessonTimeAlignment", "displayName":"Alignment", "default": false}
    ],
    attenAlg: [
        {conditions: [ 
            {variable:'netHours',operator:'greater-than-or-equal-to',value:0}, 
            {variable:'lessonsBehind',operator:'less-than',value:20} 
        ], result: {state: 'Approve', color:'green', suggestion: 'Approve attendance as is.', summary: 'Student is caught up on time and is less than 20 lessons behind.'}},
        {conditions: [ 
            {variable:'netHours',operator:'greater-than-or-equal-to',value:0}, 
            {variable:'lessonsBehind',operator:'greater-than-or-equal-to',value:20}, 
            {variable:'lessonsBehind',operator:'less-than',value:35} 
        ], result: {state: 'Review', color:'yellow', suggestion: 'Consider adjustments', summary: 'Student is caught up on time, but is slightly behind with 20 or more lessons.'}},
        {conditions: [ {
            variable:'netHours',operator:'greater-than-or-equal-to',value:0}, 
            {variable:'lessonsBehind',operator:'greater-than-or-equal-to',value:35} 
        ], result: {state: 'Adjust', color:'red', suggestion: 'Consider removing time.', summary: 'Student is caught up on time, but is far behind with 35 or more lessons.' }},
        {conditions:[
            {variable:'netHours',operator:'less-than',value:0}, 
            {variable:'lessonsBehind',operator:'greater-than-or-equal-to',value:20},
            {variable:'lessonTimeAlignment',operator:'within-plus-minus-range',value:10}
        ],result:{state: 'Review', color:'yellow', suggestion: 'Missing time and lessons are aligned.', summary: 'Student is behind on time and lessons, but those numbers are closely aligned assuming 1hr per lesson.'}},
        {conditions:[
            {variable:'netHours',operator:'less-than',value:0},
            {variable:'lessonsBehind',operator:'greater-than-or-equal-to',value:20},
            {variable:'lessonTimeAlignment',operator:'exceeds-plus-minus-range',value:10}
        ],result:{state: 'Adjust', color:'red', suggestion: 'Align time with missing lessons.', summary: 'Student is behind on time and lessons and those numbers are not closely aligned.'}},
        {conditions:[
            {variable:'netHours',operator:'less-than',value:0}, 
            {variable:'lessonsBehind',operator:'less-than',value:20}
        ],result:{state: 'Adjust', color:'red', suggestion: 'Consider adding time.', summary: 'Student is behnd on time, but caught up on lessons.'}}
    ],
    "calendar": ["8/16/21", "8/17/21", "8/18/21", "8/19/21", "8/20/21", "8/23/21", "8/24/21", "8/25/21", "8/26/21", "8/27/21", "8/30/21", "8/31/21", "9/1/21", "9/2/21", "9/3/21", "9/7/21", "9/8/21", "9/9/21", "9/10/21", "9/13/21", "9/14/21", "9/15/21", "9/16/21", "9/17/21", "9/20/21", "9/21/21", "9/22/21", "9/23/21", "9/24/21", "9/27/21", "9/28/21", "9/29/21", "9/30/21", "10/1/21", "10/4/21", "10/5/21", "10/6/21", "10/7/21", "10/8/21", "10/12/21", "10/13/21", "10/14/21", "10/15/21", "10/18/21", "10/19/21", "10/20/21", "10/21/21", "10/22/21", "10/25/21", "10/26/21", "10/27/21", "10/28/21", "10/29/21", "11/1/21", "11/2/21", "11/3/21", "11/4/21", "11/5/21", "11/8/21", "11/9/21", "11/10/21", "11/11/21", "11/12/21", "11/15/21", "11/16/21", "11/17/21", "11/18/21", "11/19/21", "11/22/21", "11/23/21", "11/29/21", "11/30/21", "12/1/21", "12/2/21", "12/3/21", "12/6/21", "12/7/21", "12/8/21", "12/9/21", "12/10/21", "12/13/21", "12/14/21", "12/15/21", "12/16/21", "12/17/21", "12/20/21", "1/10/22", "1/11/22", "1/12/22", "1/13/22", "1/14/22", "1/18/22", "1/19/22", "1/20/22", "1/21/22", "1/24/22", "1/25/22", "1/26/22", "1/27/22", "1/28/22", "1/31/22", "2/1/22", "2/2/22", "2/3/22", "2/4/22", "2/7/22", "2/8/22", "2/9/22", "2/10/22", "2/11/22", "2/14/22", "2/15/22", "2/16/22", "2/17/22", "2/18/22", "2/22/22", "2/23/22", "2/24/22", "2/25/22", "2/28/22", "3/1/22", "3/2/22", "3/3/22", "3/4/22", "3/7/22", "3/8/22", "3/9/22", "3/10/22", "3/11/22", "3/21/22", "3/22/22", "3/23/22", "3/24/22", "3/25/22", "3/28/22", "3/29/22", "3/30/22", "3/31/22", "4/1/22", "4/4/22", "4/5/22", "4/6/22", "4/7/22", "4/8/22", "4/11/22", "4/12/22", "4/13/22", "4/14/22", "4/15/22", "4/18/22", "4/19/22", "4/20/22", "4/21/22", "4/22/22", "4/25/22", "4/26/22", "4/27/22", "4/28/22", "4/29/22", "5/2/22", "5/3/22", "5/4/22", "5/5/22", "5/6/22", "5/9/22", "5/10/22", "5/11/22", "5/12/22", "5/13/22", "5/16/22", "5/17/22", "5/18/22", "5/19/22", "5/20/22"]
  }

  */


