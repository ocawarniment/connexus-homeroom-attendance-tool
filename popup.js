let bgConsole = {
    log: function(value){
        chrome.runtime.sendMessage({type: 'log', value: value});
    }
}

loadPopup();

function loadPopup(){
    // surface chromestorag vals to the window
    chrome.storage.local.get(null, result => {
        cryptoPass = result.chatLedger.cryptoPass;
        console.log(result);
        window.chatData.students = result.students;
        window.chatData.userSettings = result.userSettings;
        window.chatData.chatLedger = result.chatLedger;
        console.log('loading popup.js');
        loadSchoolLogo();
        loadCurrentApproval();
        loadStudentTable();
        loadSettingsModal();
        displayDateMode();
        attachHandlers();  
    })
}

function loadSchoolLogo(school){
    bgConsole.log(school);
    document.querySelector('#schoolLogo').src = `images/${school || chatData.userSettings.school}logo.png`;
}

function selectSchool(btnId){
    // school
    let schoolBtn = document.querySelector(`#${btnId}`);
    let school = schoolBtn.getAttribute('school');
    // remove active to the others
    document.querySelectorAll('.btn-school').forEach(btn => {try{ btn.classList.remove('active') }catch(err){}})
    // add the class 'active' to the clicked button
    document.querySelector(`#${btnId}`).classList.add('active');
    // change the logo
    loadSchoolLogo(school);
    // save settings
    saveSettings();
    // loadDisplayFields
    loadSettingsTableFields();
    // reattch all handlers
    attachHandlers();
}


function attachHandlers(){
    // downloadSection Button
    document.querySelector('#btnDownloadSection').onclick = downloadSection;
    // Section ID on change
    document.querySelector('#inputSectionId').onchange = () => {
        chrome.storage.local.get(null, result => {
            let currentApproval = result.currentApproval;
            currentApproval.sectionId = document.querySelector('#inputSectionId').value;
            chrome.storage.local.set({currentApproval: currentApproval});
        })
	}
    // startDate on change
    document.querySelector('#inputStartDate').onchange = enableManualDateMode;
    // endDate on change
    document.querySelector('#inputEndDate').onchange = enableManualDateMode;

    // up and down arrow buttons on approval window
    document.querySelector('#inputApprovalWindowUp').onclick = () => { 
        if(document.querySelector('#inputApprovalWindow').value < 4) {
            document.querySelector('#inputApprovalWindow').value = parseInt(document.querySelector('#inputApprovalWindow').value) + 1;
            saveSettings();
            displayAutoDateRange(document.querySelector('#inputApprovalWindow').value);
        } else {
            window.alert('Approval window cannot exceed 4 weeks.');
        }
    }
    document.querySelector('#inputApprovalWindowDown').onclick = () => { 
        if(document.querySelector('#inputApprovalWindow').value > 1) {
            document.querySelector('#inputApprovalWindow').value = parseInt(document.querySelector('#inputApprovalWindow').value) - 1;
            saveSettings();
            displayAutoDateRange(document.querySelector('#inputApprovalWindow').value);
        } else {
            window.alert('Approval window must be at least 1 week.');
        }
    }

    // update chatLedger
    document.querySelector('#btnUpdateChatLedger').onclick = updateChatLedger;

    // document
    document.querySelectorAll('.btn-school').forEach(btn => {
        btn.onclick = () => {selectSchool(btn.id)}
    })

    // attach onChange listeners to all fields for dynamic saving
    let checkboxes = document.querySelectorAll('#setTableFields .form-check-input');
    checkboxes.forEach(checkbox => {
        checkbox.onclick = ()=>{saveSettings()}
    })

    // select all deselect all fields for table
    document.querySelector('#tableSelectAll').onclick = () => {
        checkboxes.forEach(checkbox => {
            !checkbox.hasAttribute('disabled') ? checkbox.checked = true : false;
        })
        saveSettings();
    }
    document.querySelector('#tableDeselectAll').onclick = () => {
        checkboxes.forEach(checkbox => {
            !checkbox.hasAttribute('disabled') ? checkbox.checked = false : checkbox.checked = true;
        })
        saveSettings();
    }

    // attach the click listener to X on settings modal
    document.querySelector('#btn-closeSettings').onclick = () => {
        saveSettings();
        $('#settingsModal').modal('hide');
    }
}

function displayDateMode(){
    chrome.storage.local.get(null, result => {
        let manualDateMode = result.currentApproval.manualDateMode;
        if(manualDateMode) {
            // set the banner
            document.querySelector('#dateBanner').innerText = "Manual Date Mode - Click HERE to switch back to automatic.";
            document.querySelector('#dateBanner').className = 'bg-warning';
            // onclick to return to autoDates
			document.querySelector('#dateBanner').onclick = disableManualDateMode;
        } else {
            // set the banner
            document.querySelector('#dateBanner').innerText = `Auto Date Mode - ${chatData.userSettings.approvalWindowWeeks} Week Approval Window`;
            document.querySelector('#dateBanner').className = 'bg-medium';
            // refresh dates
            //disableManualDateMode();
        }
    })
}

// manual date change button
function enableManualDateMode() {
    chrome.storage.local.get(null, result => {
        // update start & end date
        let currentApproval = result.currentApproval;
        currentApproval.startDate = document.querySelector('#inputStartDate').value;
        currentApproval.endDate = document.querySelector('#inputEndDate').value;
        currentApproval.manualDateMode = true;
        chrome.storage.local.set({currentApproval: currentApproval});
        displayDateMode();
    })
}

function disableManualDateMode() {
    chrome.storage.local.get(null, result => {
        let windowWeeks = result.userSettings.approvalWindowWeeks;
        // calculate autoDates
        var todayDate = new Date();
        var startDate = new Date(todayDate);
        // set to Monday of this week
        startDate.setDate(todayDate.getDate() - (todayDate.getDay() + 7) % 7);
        // set to previous Monday
        startDate.setDate(startDate.getDate() - 7*windowWeeks);
        var endDate = new Date(addDays(startDate,6*windowWeeks+(windowWeeks-1)));
        // update formatting
        var startMonth = startDate.getMonth() + 1;
        if (startMonth < 10) { startMonth = "0" + startMonth };
        var startDay = startDate.getDate();
        if (startDay < 10) { startDay = "0" + startDay };
        var startYear = startDate.getYear() + 1900;
        var endMonth = endDate.getMonth() + 1;
        if (endMonth < 10) { endMonth = "0" + endMonth };
        var endDay = endDate.getDate();
        if (endDay < 10) { endDay = "0" + endDay };
        var endYear = endDate.getYear() + 1900;

        let startDateString = startYear+"-"+startMonth+"-"+startDay;
        let endDateString = endYear+"-"+endMonth+"-"+endDay;

        document.querySelector("#inputStartDate").value = startDateString;
        document.querySelector("#inputEndDate").value = endDateString;

        // update the settings storage
        let currentApproval = result.currentApproval;
        currentApproval.startDate = startDateString;
        currentApproval.endDate = endDateString;
        currentApproval.manualDateMode = false;
        chrome.storage.local.set({currentApproval: currentApproval});
        displayDateMode();
    })
}

function displayAutoDateRange(windowWeeks){
    // calculate autoDates
    var todayDate = new Date();
    var startDate = new Date(todayDate);
    // set to Monday of this week
    startDate.setDate(todayDate.getDate() - (todayDate.getDay() + 7) % 7);
    // set to previous Monday
    startDate.setDate(startDate.getDate() - 7*windowWeeks);
    var endDate = new Date(addDays(startDate,6*windowWeeks+(windowWeeks-1)));
    // update formatting
    var startMonth = startDate.getMonth() + 1;
    if (startMonth < 10) { startMonth = "0" + startMonth };
    var startDay = startDate.getDate();
    if (startDay < 10) { startDay = "0" + startDay };
    var startYear = startDate.getYear() + 1900;
    var endMonth = endDate.getMonth() + 1;
    if (endMonth < 10) { endMonth = "0" + endMonth };
    var endDay = endDate.getDate();
    if (endDay < 10) { endDay = "0" + endDay };
    var endYear = endDate.getYear() + 1900;

    let startDateString = startYear+"-"+startMonth+"-"+startDay;
    let endDateString = endYear+"-"+endMonth+"-"+endDay;

    document.querySelector("#inputStartDate").value = startDateString;
    document.querySelector("#inputEndDate").value = endDateString;

    displayDateMode();
}

function approveAttendance(studentID, studentInfo) {
    var startDate = document.querySelector('#inputStartDate').value;
    var endDate = document.querySelector('#inputEndDate').value;
    // OCA ONLY
    var extraInfo = '';
    if(chatData.userSettings.school== 'oca') {
        if(studentInfo.cte !== 'false') {
            extraInfo = "&cte=auto";
        }
        if(studentInfo.ccp !== 'false') {
            extraInfo = "&ccp=auto";
        }
    }
    let url = 'https://www.connexus.com/webuser/activity/activity.aspx?idWebuser=' + studentID + '&startDate=' + startDate + '&endDate=' + endDate + extraInfo;
    chrome.tabs.create({ url: url, selected: true}, function(tab) { });
}

function loadApproveButtons(){
    console.log('chatData',chatData);
        // loop all cells
        let studentRows = document.querySelectorAll('#studentTable > tbody > tr');
        studentRows.forEach(studentRow => {
            // get the student ID
            let studentId = studentRow.id.match(/(?<=tr\-ST).*/g)[0];
            let student = chatData.students[`ST${studentId}`];
            // get the approveButton cell
            let apvBtnCell = studentRow.querySelector('.td-approveButton'); 
            // create button div for inside cells
            let btnCellDiv = document.createElement('div'); //class="btn-group" role="group"
            btnCellDiv.className = 'btn-group';
            btnCellDiv.setAttribute('role', 'group');
            // create button
            let approveButton = document.createElement('button');
            approveButton.setAttribute('studentid', studentId);
            approveButton.setAttribute('ccp', chatData.students[`ST${studentId}`].ccpHours || false);
            approveButton.setAttribute('cte', chatData.students[`ST${studentId}`].cteHours || false);
            approveButton.className = 'btn abg-approve';
            approveButton.innerText = 'APPROVE';
            approveButton.onclick = function() {
                approveAttendance(this.getAttribute('studentid'), {"cte":this.getAttribute('cte'), "ccp":this.getAttribute('ccp')});
            };
            
            // create info button
            let infoButton = document.createElement('button');
            infoButton.className = 'btn btn-light abg-info';
            infoButton.innerText = 'ⓘ';
            infoButton.setAttribute('type', 'button');
            infoButton.setAttribute('data-toggle',"tooltip"); 
            infoButton.setAttribute('data-placement',"right"); 

            // CALCULATE ADVICE - buttonColor; buttonText; guidanceBody; guidanceToolTip
            let studentAlgOutcome = getStudentOutcome(student, chatData.chatLedger[chatData.userSettings.school]);
            // do the stuff with the outcome
            if(studentAlgOutcome.length > 0) {
                approveButton.classList.add(`abg-${studentAlgOutcome[0].state}`);
                approveButton.innerText = studentAlgOutcome[0].state.toUpperCase();
                approveButton.setAttribute('style', `background-color: ${studentAlgOutcome[0].color}`);
                infoButton.setAttribute('title', studentAlgOutcome[0]?.suggestion + '\n\n' + studentAlgOutcome[0]?.summary || 'Could not calculate suggestion.');
            } else {
                // could not calc... fallback
            }

            // if the student is already complete, strikeout and make gray
            if(student.complete){
                approveButton.setAttribute('style', 'text-decoration: line-through;');
            }

            // add to the div
            btnCellDiv.appendChild(approveButton);
            btnCellDiv.appendChild(infoButton);
            // replace on the current student row
            apvBtnCell.innerHTML = '';
            apvBtnCell.appendChild(btnCellDiv);
        })

    // enable all tooltips for i buttons
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    })
}

function downloadSection(){
    // check that the fields are populated
    // getSectionId
    let sectionId = document.querySelector('#inputSectionId').value;
    // getStartDate
    let startDate = document.querySelector('#inputStartDate').value;
    // getEndDate
    let endDate = document.querySelector('#inputEndDate').value;
    // ALLOW FOR DEBUG
    if(sectionId == 'DEBUG') {
        window.alert('DEBUG');
        // send the req to background
        chrome.runtime.sendMessage({type: 'getDebugRoster'});
    } else {
        if(sectionId && startDate && endDate) {
            // set background vars
            let currentApproval = {sectionId: sectionId, startDate: startDate, endDate: endDate};
            chrome.storage.local.set({currentApproval: currentApproval});
            // send the req to background
            chrome.runtime.sendMessage({type: 'getRoster', sectionId: sectionId});
            // store the sync
            storeLastSync();
        } else {
            // prompt user
            window.alert('Please make sure you have entered a Section ID, Start Date, and End Date.');
        }
    }
}

function loadStudentTable(){
    bgConsole.log('loading student table');
    // check if students exists
    if(chatData.students !== undefined) {
        console.log('got some');
            let students = chatData.students;
            // variables for loop
            let studentCount = students.length;
            let homeroomStudents = students;
            let studentIds = Object.keys(homeroomStudents);
    
            // create table dynamically school.json
            let displayEntries = [];
            // get neces display settings
            bgConsole.log(chatData.userSettings);
            chatData.userSettings.popupTableDisplayFields.forEach(dField => {
                // create the object entry
                let objEntry = {field: dField};
                // get the display name from schoolVars
                objEntry.displayName = chatData.chatLedger.popupDisplay.filter(pDis => pDis.field == dField)[0]?.displayName || objEntry.field;
                objEntry.hovertext = chatData.chatLedger.popupDisplay.filter(pDis => pDis.field == dField)[0]?.hovertext || '';
                displayEntries.push(objEntry);
            })
            //let displayEntires = schoolVars.popupDisplay;
            // prepend the id and name cells - REQUIRED
            //displayEntries.unshift({'field':'id','displayName':'ID'}, {'field':'name','displayName':'Student'});
    
            // create the table
            var studentTable = document.createElement("table");
            studentTable.id = 'studentTable';
            studentTable.className = 'table table-striped';//'uk-table uk-table-striped uk-table-divider';
    
            // create the header row
            let headerDiv = document.createElement("thead");
            let headerRow = document.createElement("tr");
            displayEntries.forEach(entry => {
                // create the header cells
                let entryHeaderCell = document.createElement('th');
                entryHeaderCell.innerHTML = entry.displayName;
                entryHeaderCell.className = '';
                entryHeaderCell.title = entry.hovertext;
                headerRow.appendChild(entryHeaderCell);
            })
            headerDiv.append(headerRow);
            studentTable.append(headerDiv);
    
            // create the table body
            let tableBody = document.createElement('tbody');
    
            // loop all students and add their standard rows
            studentIds.forEach(studentId => {
                let student = homeroomStudents[studentId];
                // create the student row
                let studentRow = document.createElement('tr');
                studentRow.id = `tr-${studentId}`;
    
                // loop the display entries
                displayEntries.forEach(entry => {
                    // create the cell
                    let studentEntryCell = document.createElement('td');
                    studentEntryCell.className = `td-${entry.field} align-middle`;
                    // ADDITIONAL CLEANUP VAL LOGIC
                    let cellValue = student[entry.field];
                    entry.field == 'name' ? cellValue = CryptoJS.AES.decrypt(cellValue,cryptoPass).toString(CryptoJS.enc.Utf8) : false ;
                    // set the cell value
                    studentEntryCell.innerHTML = cellValue == null ? "N/A" : cellValue;
                    studentRow.appendChild(studentEntryCell);
                })
                tableBody.appendChild(studentRow);
                studentTable.appendChild(tableBody);
            })
    
            // display the table
            // replace table
            var placeholder = document.querySelector('#studentTable');
            placeholder.parentNode.replaceChild(studentTable, placeholder);
            // sort it
            sortTable(2);
            // add the approve buttons
            loadApproveButtons();
            // update the studentNames to link dropdowns
            loadStudentDropDowns();
    } else {
        // display banner to download section
        let noStudentsBanner = document.createElement('div');
        noStudentsBanner.className = 'alert alert-warning';
        noStudentsBanner.setAttribute('role', 'alert');
        noStudentsBanner.innerText = 'Enter your Section ID in the card above and click Download Section to see your students list here.';
        noStudentsBanner.setAttribute('style','margin-bottom: 0px; margin-top: 3px; text-align: center;')
        try{
            let placeholder = document.querySelector('#studentTable');
            placeholder.parentNode.replaceChild(noStudentsBanner, placeholder);
        } catch(err) {
            // do nothing
        }
    }
}

function loadStudentDropDowns(){

    // loop all cells
    let studentRows = document.querySelectorAll('#studentTable > tbody > tr');
    console.log(studentRows);
    let i = 0;
    studentRows.forEach(studentRow => {

        // get the current cell
        let studentNameCell = studentRow.querySelector('.td-name');
        let studentName = studentNameCell.innerText;
        // get the student ID
        let studentId = studentRow.id.match(/(?<=tr\-ST).*/g)[0];
        let student = chatData.students[`ST${studentId}`];

        let studentDropdownDiv = document.createElement('div');
        studentDropdownDiv.className = 'btn-group dpd-group';
        let studentDropdownMain = document.createElement('button');
        studentDropdownMain.className = 'btn btn-secondary btn-sm dpd-main';
        studentDropdownMain.setAttribute('type','button');
        studentDropdownMain.innerText = studentName;
        let studentDropdownArrow = document.createElement('button');
        studentDropdownArrow.setAttribute('type','button');
        studentDropdownArrow.className = 'btn btn-sm btn-secondary dropdown-toggle dropdown-toggle-split dpd-arrow';
        studentDropdownArrow.id = `dropdown-ST${studentId}`;
        studentDropdownArrow.setAttribute('data-bs-auto-close','true');
        studentDropdownArrow.setAttribute('data-bs-toggle', 'dropdown');
        studentDropdownArrow.setAttribute('aria-expanded', 'false');
        let studentDropdownArrowSpan = document.createElement('span');
        studentDropdownArrowSpan.className = 'visually-hidden';
        let studentDropdownList = document.createElement('ul');
        studentDropdownList.setAttribute('aria-labelledby',`dropdown-ST${studentId}`);
        studentDropdownList.className = 'dropdown-menu';
        // create all the links
        let studentLinks = chatData.chatLedger.studentLinks;
        // loop through 
        studentLinks.forEach(link => {
            //<li><a class="dropdown-item" href="#">Action</a></li>
            let listItem = document.createElement('li');
            let itemLink = document.createElement('a');
            itemLink.className = 'dropdown-item';
            // convert href
            let formattedHref = link.href;
            let placeholderRegex = /\{\{([^\}]*)\}\}/g;
            let placeholders = link.href.match(placeholderRegex);
            placeholders.forEach(placeholder => {
                // get the inner field name
                let fieldRegex = /(?<=\{\{)(.*?)(?=\}\})/g;
                let fieldName = placeholder.match(fieldRegex)[0];
                // if preceded by _, then get schoolvar
                if(fieldName.charAt(0) == '_') {
                    // school var
                    let schoolFieldName = fieldName.substring(1);
                    let fieldTreeItems = schoolFieldName.split(".");
                    let schoolVars = chatData.chatLedger[chatData.userSettings.school];
                    let output = schoolVars;
                    fieldTreeItems.forEach(branch => {
                        output = output[branch];
                    })
                    formattedHref = formattedHref.replace(placeholder, output);
                } else {
                    // student var
                    formattedHref = formattedHref.replace(placeholder, chatData.students[`ST${studentId}`][fieldName]);
                }
            })
            // add the specifics to the element
            itemLink.setAttribute('href', formattedHref);
            itemLink.setAttribute('target', '_blank');
            itemLink.innerText = link.title;
            // add to the element
            listItem.appendChild(itemLink);
            studentDropdownList.appendChild(listItem);
        })

        studentDropdownArrow.appendChild(studentDropdownArrowSpan);
        studentDropdownDiv.appendChild(studentDropdownMain);
        studentDropdownDiv.appendChild(studentDropdownArrow);
        studentDropdownDiv.appendChild(studentDropdownList);

        studentNameCell.innerHTML = '';
        studentNameCell.setAttribute('style', `z-index: ${100-i} !important;`)
        studentNameCell.appendChild(studentDropdownDiv);

        new bootstrap.Dropdown(studentDropdownArrow); // setup the bootstrap

        i++;
    })

}

function loadSettingsTableFields() {
    // clear all current checkboxes
    document.querySelector('#setTableFields').innerHTML = '';
    //let studentAtts = getStudentAttributes();
    let displayEntries = chatData.chatLedger.popupDisplay;
    //displayEntries.unshift({'field':'id','displayName':'ID'}, {'field':'name','displayName':'Student'});
    // create multiple input eles and drop them on the modal
    displayEntries.forEach(displayEntry => {
        // create the input holder <div class="form-check">
        let checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'form-check';
        // create the input <input class="form-check-input" type="checkbox" value="" id="defaultCheck1">
        let checkbox = document.createElement('input');
        checkbox.className = 'form-check-input';
        checkbox.id = `cb_${displayEntry.field}`;
        checkbox.setAttribute('type', 'checkbox');
        if(displayEntry.field == 'id' || displayEntry.field == 'name' || displayEntry.field == 'approveButton') {
            checkbox.setAttribute('checked', 'true');
            checkbox.setAttribute('disabled', '');
        }
        // create the label <label class="form-check-label" for="defaultCheck1">
        let checkLabel = document.createElement('label');
        checkLabel.className = 'form-check-label';
        checkLabel.innerHTML = displayEntry.displayName;
        checkLabel.title = displayEntry.hovertext;
        checkLabel.setAttribute('for', `cb_${displayEntry.field}`);
        // add them both to the 
        checkboxDiv.appendChild(checkbox);
        checkboxDiv.appendChild(checkLabel);
        // add them to the div on the modal
        document.querySelector('#setTableFields').appendChild(checkboxDiv);
    })

    // check the boxes already in settings
    let displayFields = chatData.userSettings.popupTableDisplayFields || ['lastLogin', 'lastContact', 'attendanceStatus', 'escelation', 'gapDate', 'missingHours'];
    // loop through the displayFields and set the cbox value checked to true
    displayFields.forEach(dField => {
        document.querySelector(`#cb_${dField}`).setAttribute('checked','true');
    })
}

function loadCurrentApproval(){
    chrome.storage.local.get(null, result => {
        // if auto date; recalc
        try{
            if(!result.currentApproval.manualDateMode) {
                disableManualDateMode();
            } else {
                document.querySelector('#inputStartDate').value = result.currentApproval.startDate;
                document.querySelector('#inputEndDate').value = result.currentApproval.endDate;
            }
            // set the section ID, startDate, endDate
            document.querySelector('#inputSectionId').value = result.currentApproval.sectionId || '';
            // set the last sync
            document.querySelector('#lastSync').innerText = result.userSettings.lastSync.substring(0,24) || '';
        } catch(err) {}
    })
}

function loadSettingsModal(){
    // load the fields for the school
    loadSettingsTableFields();

    // load the approvalWindowWeeks
    document.querySelector('#inputApprovalWindow').value = chatData.userSettings.approvalWindowWeeks;

    // load the extension manifest AND.chatLedger version numbers from versioning.js
    refreshVersionNumbers();

    // set current school as active
    let school = chatData.userSettings.school;
    document.querySelector(`#btnSchool_${school}`).classList.add('active'); 
}

async function saveSettings(){
    bgConsole.log('saving settings');
    // update the window var
    chrome.storage.local.get(null, result => {
        let userSettings = result.userSettings;
        // check all settings cards and store
        // school selected - get the one that is active
        let school = document.querySelector('.btn-school.active').getAttribute('school');
        userSettings.school = school;

        // setTableFields
        let tableFieldsCard = document.querySelector('#setTableFields');
        // loop through the boxes and send the checked to an array; remove first three chars cb_ from id
        let popupTableDisplayFields = [];
        tableFieldsCard.querySelectorAll('.form-check-input').forEach(checkbox => {
            checkbox.checked ? popupTableDisplayFields.push(checkbox.id.replace('cb_','')) : false ;
        })
        // approval window weeks
        userSettings.approvalWindowWeeks = document.querySelector('#inputApprovalWindow').value;

        // push back to settings
        userSettings.popupTableDisplayFields = popupTableDisplayFields;

        // update chatData window
        chatData.userSettings = userSettings;

        // store it
        chrome.storage.local.set({userSettings: userSettings});

        // refresh the student table
        loadStudentTable();

        // refresh dates
        displayDateMode();
    })
}

function storeLastSync() {
    chrome.storage.local.get(null, result => {
        let userSettings = result.userSettings;
        let lastSyncDate = new Date();
        userSettings.lastSync = lastSyncDate.toString();
        chrome.storage.local.set({userSettings: userSettings});
    })
}

function saveModal(){
    saveSettings();
    location.reload();
}

function sortTable(colNum) {
    var table, rows, switching, i, x, y, shouldSwitch;
    table = document.getElementById("studentTable");
    switching = true;
    /*Make a loop that will continue until
    no switching has been done:*/
    while (switching) {
      //start by saying: no switching is done:
      switching = false;
      rows = table.getElementsByTagName("TR");
      /*Loop through all table rows (except the
      first, which contains table headers):*/
      for (i = 1; i < (rows.length - 1); i++) {
        //start by saying there should be no switching:
        shouldSwitch = false;
        /*Get the two elements you want to compare,
        one from current row and one from the next:*/
        x = rows[i].getElementsByTagName("TD")[colNum-1];
        y = rows[i + 1].getElementsByTagName("TD")[colNum-1];
        //check if the two rows should switch place:
        if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
          //if so, mark as a switch and break the loop:
          shouldSwitch= true;
          break;
        }
      }
      if (shouldSwitch) {
        /*If a switch has been marked, make the switch
        and mark that a switch has been done:*/
        rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
        switching = true;
      }
    }
}

// increment days function
function addDays(date, daysAdded) {
    var nextDay = new Date(date.getTime()+1000*60*60*24*daysAdded);
    return nextDay;
}


// store the downloaded school vars
function storeSchoolVars(data){
    // update storage
	chrome.storage.local.get(null,function(result){
        chrome.storage.local.set({'chatLedger':data});
	});
    // update local var
    chatData.chatLedger = data;
}

// store specific school vars in memory - only download when switching schools
async function refreshSchoolVars(){
	// pull from github
	var timestamp = new Date();
	var githubUrl = "https://raw.githubusercontent.com/ocawarniment/ocawarniment.github.io/master/chatLedger.json" + "?timestamp=" + timestamp.toString();

    fetch(githubUrl)
        .then(response => response.json())
        .then(data => storeSchoolVars(data))
}

// make the logo a toggle'
document.querySelector('#schoolLogo').onclick = () => {
    window.alert('refreshingvars');
    refreshSchoolVars();
}

  /*
let testStudent = JSON.parse("{\"ST1015991\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":\"6/28/2021\",\"id\":\"1015991\",\"lastContact\":\"7/9/2021\",\"lastLogin\":\"8/15/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[-1334209718,-790332266,-1018476001,-1796579098]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[2110222650,-1835375968,-765720184,-543800168]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[881322618,-987858586,956672535,506476760,419501084,2088533995,1539117557,720240990,2110222650,-1835375968,-765720184,-543800168]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[1630266416,310102632]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"HW4034832\",\"totalApproved\":null,\"totalRequired\":null},\"ST1100779\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":\"6/19/2021\",\"id\":\"1100779\",\"lastContact\":null,\"lastLogin\":\"8/15/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[140711329,1393737711,1483733184,-1640627861]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[1330581575,902900296,654969685,1863204228]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-1043834703,2129299141,1192446969,-2114486278,-1497610987,1265745475,-981996570,1516823831,1330581575,902900296,654969685,1863204228]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[966908401,236964102]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"TO4318629\",\"totalApproved\":null,\"totalRequired\":null},\"ST1762380\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":\"6/22/2021\",\"id\":\"1762380\",\"lastContact\":null,\"lastLogin\":\"8/15/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":32,\"words\":[809837898,1780931228,-805360302,-43627671,462498778,1650987204,-1313776817,-2108073777]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[-312873341,-777513643,-691682881,-1494140947]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[1635407139,-738444952,-929278027,995468623,1182397410,-1542788085,180413461,-1278685546,-312873341,-777513643,-691682881,-1494140947]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[2129897477,473636388]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"WD2942144\",\"totalApproved\":null,\"totalRequired\":null},\"ST1972850\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"1972850\",\"lastContact\":null,\"lastLogin\":\"7/15/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[-217043874,1402907821,-853850415,-80530683]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[44468477,152244925,1543782902,1834996704]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[1533520448,257287259,-2072857061,400279240,-1808960066,927845940,-269980704,-1522154660,44468477,152244925,1543782902,1834996704]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[-191315666,1446329493]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"UB8720903\",\"totalApproved\":null,\"totalRequired\":null},\"ST2336148\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"2336148\",\"lastContact\":\"7/16/2021\",\"lastLogin\":\"7/29/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":32,\"words\":[-1478083767,2053553566,677821681,-320191291,-1743378756,1769683387,1693188550,-1106256672]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[1221674021,-262587574,-1389209870,-1997759647]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[567775550,-1564026867,-1530727307,920820629,1703334366,-232302240,-1231707659,-1942854520,1221674021,-262587574,-1389209870,-1997759647]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[-936593921,-1462806307]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"UQ5139626\",\"totalApproved\":null,\"totalRequired\":null},\"ST2365428\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"2365428\",\"lastContact\":null,\"lastLogin\":\"5/20/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":32,\"words\":[-104426512,-846961053,1294342821,-894894771,375854664,-738936873,340715286,626774027]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[-1475934267,-2019052800,-214803692,861693168]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-417660592,1818848287,-1365382475,-644277468,-1502312853,-129816267,178774119,-1480054928,-1475934267,-2019052800,-214803692,861693168]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[-1197761286,-1168465738]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"TK2331755\",\"totalApproved\":null,\"totalRequired\":null},\"ST2378563\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"2378563\",\"lastContact\":\"8/4/2021\",\"lastLogin\":\"5/20/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[2033605846,-1157413839,117444513,-1912367273]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[394197827,-1895501569,227271531,-111496012]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[1406452414,-78519961,-1929584185,-726911898,-631441649,-65159533,355456460,42970563,394197827,-1895501569,227271531,-111496012]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[332135313,-261153412]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"YJ4066268\",\"totalApproved\":null,\"totalRequired\":null},\"ST2421310\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":\"6/24/2021\",\"id\":\"2421310\",\"lastContact\":\"7/14/2021\",\"lastLogin\":\"6/24/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[1343820407,-1974617615,1218227212,724403073]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[406245068,275594654,-570347661,-1436809898]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-1140864651,380064539,1296047954,-606212971,-2143347702,-1474099396,708372789,963387382,406245068,275594654,-570347661,-1436809898]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[-378845655,-271439577]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"UR5666274\",\"totalApproved\":null,\"totalRequired\":null},\"ST2463753\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":\"6/10/2021\",\"id\":\"2463753\",\"lastContact\":null,\"lastLogin\":\"6/10/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":32,\"words\":[-928008622,-950882059,240983109,-1166550280,-296204148,-1267272870,-1853207246,2110814271]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[385578285,1354028609,-652967896,-188190129]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-1919852810,-931059409,1157110413,-1866133571,-169497120,708553092,-1968999422,-885988034,385578285,1354028609,-652967896,-188190129]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[2011258606,243196674]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"UR9222285\",\"totalApproved\":null,\"totalRequired\":null},\"ST2532252\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":\"5/24/2021\",\"id\":\"2532252\",\"lastContact\":null,\"lastLogin\":\"5/24/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[-404173218,1234991212,894410331,-1209488444]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[123358045,459821038,1896243311,1317612531]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-1868301684,-599998311,-407966818,-196162234,72141180,-291944205,1596913404,-1855068109,123358045,459821038,1896243311,1317612531]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[334099298,-225121426]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"UT9321783\",\"totalApproved\":null,\"totalRequired\":null},\"ST2659073\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":\"6/8/2021\",\"id\":\"2659073\",\"lastContact\":null,\"lastLogin\":\"8/15/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":32,\"words\":[1774458942,-983506595,-1553698744,-147785902,1529711843,1686868012,-307511692,-768532131]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[-1366793430,422975794,1938695503,-1667120843]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-1933989113,-1161732249,200100849,-2060597157,207475001,-1179467158,-1265238230,1078650165,-1366793430,422975794,1938695503,-1667120843]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[1761042403,-1788421018]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"FJ2403906\",\"totalApproved\":null,\"totalRequired\":null},\"ST2791634\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"2791634\",\"lastContact\":null,\"lastLogin\":\"5/21/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[1210868895,1207937497,-1173507270,1143056168]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[1266212569,143852489,531218194,-2011563597]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[1961290497,-1184227456,1275938726,163444757,405484457,-702607633,-1139492826,-434923921,1266212569,143852489,531218194,-2011563597]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[-1952381670,-401091816]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"WD2517734\",\"totalApproved\":null,\"totalRequired\":null},\"ST3509713\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":\"6/20/2021\",\"id\":\"3509713\",\"lastContact\":null,\"lastLogin\":\"8/15/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[-1216858826,1029970019,1432452523,-332928378]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[807432985,1771680056,1010676774,-1218370521]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-1044708019,-1211747038,-1042354288,-769902568,-1750166723,-70144830,-950908904,1113117384,807432985,1771680056,1010676774,-1218370521]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[293706981,259687936]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"SB2989187\",\"totalApproved\":null,\"totalRequired\":null},\"ST3525255\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":\"6/3/2021\",\"id\":\"3525255\",\"lastContact\":null,\"lastLogin\":\"8/14/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[126030095,-171649975,-1994946668,1875256237]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[271930771,2034142357,-1999607662,87950542]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[1859661001,-83946179,986115472,-870748474,-989797962,1973044728,-187593297,-908162140,271930771,2034142357,-1999607662,87950542]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[250366008,-925752095]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"EM4770968\",\"totalApproved\":null,\"totalRequired\":null},\"ST3539871\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":\"5/25/2021\",\"id\":\"3539871\",\"lastContact\":null,\"lastLogin\":\"8/15/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[522400700,859739672,1635973430,683864652]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[1528360980,1408892135,942618663,1029647672]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[1484523575,1109258680,736876734,-1510578775,-1705408434,821247595,497990569,660725514,1528360980,1408892135,942618663,1029647672]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[1468971299,-825470301]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"ZV1193376\",\"totalApproved\":null,\"totalRequired\":null},\"ST3576275\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"3576275\",\"lastContact\":null,\"lastLogin\":\"5/18/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[418185049,-1389901651,-2036184439,-1393658115]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[-572765889,958567037,-908305958,-312497441]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[1037351836,654487288,1555243265,-87107994,-979231093,-1939082449,-2039639411,-354392135,-572765889,958567037,-908305958,-312497441]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[1490544780,1446691331]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"UR6592458\",\"totalApproved\":null,\"totalRequired\":null},\"ST3670780\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":\"6/1/2021\",\"id\":\"3670780\",\"lastContact\":\"8/13/2021\",\"lastLogin\":\"8/12/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":32,\"words\":[900710024,933452181,304605457,-824092641,-2021514879,632019432,2056375537,-2019862881]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[1795327840,1903524473,593783812,-2023674023]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-1642311520,696915306,1576794117,1839808811,-484158902,-849851756,-1681179115,1750442584,1795327840,1903524473,593783812,-2023674023]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[2112011068,512198950]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"TZ4005862\",\"totalApproved\":null,\"totalRequired\":null},\"ST3690131\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"3690131\",\"lastContact\":null,\"lastLogin\":\"5/19/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":32,\"words\":[-1496685812,2067477610,2024858359,609627488,-946593789,1075841429,58519733,-1723845313]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[2000906843,1298898815,-1362809109,1947858043]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-1683603085,522134064,1350853943,2007397947,1412658880,-964885267,458295340,842168279,2000906843,1298898815,-1362809109,1947858043]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[-1336894179,-1500306949]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"IH4529549\",\"totalApproved\":null,\"totalRequired\":null},\"ST3703198\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"3703198\",\"lastContact\":null,\"lastLogin\":\"8/14/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":32,\"words\":[747841363,525052657,-476713479,-734779666,88211100,1596984094,-1993788304,-412524111]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[636139297,670667338,-1122116644,-1780189469]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[1613858647,-2097014276,1337857705,784068739,-289584628,-1275143742,-379908310,-325704292,636139297,670667338,-1122116644,-1780189469]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[1111640705,-180354534]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"UR8439961\",\"totalApproved\":null,\"totalRequired\":null},\"ST3789015\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":\"5/23/2021\",\"id\":\"3789015\",\"lastContact\":null,\"lastLogin\":\"8/7/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":32,\"words\":[-971597819,402860275,1430472583,-83914268,1176479691,1913487796,-320246665,-1599257409]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[1652710316,288597970,-242933257,-1079045110]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[1278741096,-870189812,1417762140,917506036,1525947408,-1916778612,199389118,1972520065,1652710316,288597970,-242933257,-1079045110]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[-1590071388,-608367919]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"AN5422832\",\"totalApproved\":null,\"totalRequired\":null},\"ST3984580\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"3984580\",\"lastContact\":\"8/13/2021\",\"lastLogin\":\"8/13/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[1813744999,-1317301345,-168461748,-615345580]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[261463015,-851011975,-844642476,1135086105]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-872469540,2132962534,194626495,-1564695090,2098740129,1711629847,1667178270,-1322548033,261463015,-851011975,-844642476,1135086105]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[1694328883,-836097922]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"RZ5936214\",\"totalApproved\":null,\"totalRequired\":null},\"ST4013877\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":\"6/28/2021\",\"id\":\"4013877\",\"lastContact\":null,\"lastLogin\":\"8/15/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[-2064260131,881599973,1914743379,-831415366]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[-818158911,-289820441,497831380,-542803568]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-106224878,-1800572085,-2135554914,-319322147,-2064290463,-1405965460,-1719097357,1438077567,-818158911,-289820441,497831380,-542803568]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[1043929585,1195822901]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"YR6386870\",\"totalApproved\":null,\"totalRequired\":null},\"ST4019932\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":\"6/15/2021\",\"id\":\"4019932\",\"lastContact\":null,\"lastLogin\":\"8/15/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[116665507,953940342,-920346791,1679828481]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[912527968,1369824437,285103517,1402248307]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[1738907482,-416043740,-1711869051,434893,1162969802,1528742091,485294954,178000293,912527968,1369824437,285103517,1402248307]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[214544696,1887895752]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"WF3238642\",\"totalApproved\":null,\"totalRequired\":null},\"ST4039646\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":\"6/29/2021\",\"id\":\"4039646\",\"lastContact\":null,\"lastLogin\":\"7/23/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":32,\"words\":[32600107,-1709228531,1198893685,1259808498,925428812,102922314,2107323709,2026372783]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[-933796251,-1681355748,-1208900300,-982837664]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[1614515538,624035990,297653000,760722298,-1978513635,-1516966580,-1536684884,-171841641,-933796251,-1681355748,-1208900300,-982837664]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[11892090,1456955796]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"VU6732743\",\"totalApproved\":null,\"totalRequired\":null},\"ST4078310\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"4078310\",\"lastContact\":null,\"lastLogin\":\"5/19/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":32,\"words\":[269825798,1901796805,-868534825,-1476591832,1003209774,1879814153,2028464037,-1216694266]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[855935154,-652324390,-1572454086,-83120002]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-1067734743,-1040821409,-1514647568,-1659329475,-918528218,711168385,-483963319,-1735828903,855935154,-652324390,-1572454086,-83120002]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[221022579,-1027610620]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"UL4156191\",\"totalApproved\":null,\"totalRequired\":null},\"ST4125853\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"4125853\",\"lastContact\":\"8/3/2021\",\"lastLogin\":\"8/14/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[-1564037614,2039905226,1892807282,-413169538]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[1562300910,1026709356,205700828,1502788883]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-812173002,-729129795,-1632032996,-1909459507,-650330369,193149948,1918307567,-1395888844,1562300910,1026709356,205700828,1502788883]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[-1538195753,-1229369440]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"PE9949263\",\"totalApproved\":null,\"totalRequired\":null},\"ST4130327\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"4130327\",\"lastContact\":null,\"lastLogin\":null,\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[412666455,214854023,839210731,-1005950461]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[-358613016,-1797545947,1953710864,-147110113]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[1535663141,-644748798,-663061866,-2012467903,-54440926,-112680238,-1743840482,-204923737,-358613016,-1797545947,1953710864,-147110113]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[2032956655,-846434363]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"WX7024276\",\"totalApproved\":null,\"totalRequired\":null},\"ST4178873\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"4178873\",\"lastContact\":\"8/2/2021\",\"lastLogin\":\"8/15/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[-71100558,795932135,318274015,1109950515]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[1873935207,116475151,-910556016,-1950226440]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-1236144402,-1505882924,429467012,-393393969,-341147391,-1352823203,1516017524,1854177577,1873935207,116475151,-910556016,-1950226440]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[1979277870,-1263432262]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"UL8326552\",\"totalApproved\":null,\"totalRequired\":null},\"ST4191487\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"4191487\",\"lastContact\":\"7/29/2021\",\"lastLogin\":\"8/15/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[1629656947,285989138,676761258,-1516505179]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[-988806339,129942312,-1644205196,-1056911009]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[198088406,808488222,1616721240,1844851107,-1604891987,-1343230137,1598531419,1058461802,-988806339,129942312,-1644205196,-1056911009]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[-127632419,-124174004]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"XO4611856\",\"totalApproved\":null,\"totalRequired\":null},\"ST4342392\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"4342392\",\"lastContact\":null,\"lastLogin\":\"8/13/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[-383716516,-407007334,-1980566593,-1714084648]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[-1705300040,484826692,246141817,-423535417]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[1371897513,1751088151,-281268876,2112959339,-1705284133,1855062373,207997534,1566846988,-1705300040,484826692,246141817,-423535417]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[569997613,-1676044143]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"GR2751474\",\"totalApproved\":null,\"totalRequired\":null},\"ST4351220\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"4351220\",\"lastContact\":null,\"lastLogin\":\"8/15/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[190516720,-1325769764,-1985433762,-12765774]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[-369310136,-1026216150,2054238776,953561813]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-1741738929,-2127299702,-671900602,-1838086977,-978813983,132484443,-1004224921,1440521714,-369310136,-1026216150,2054238776,953561813]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[-2036819783,1576760696]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"VJ9082426\",\"totalApproved\":null,\"totalRequired\":null},\"ST4376433\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"4376433\",\"lastContact\":null,\"lastLogin\":\"8/15/2021\",\"lessonsBehind\":\"#VALUE!\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[87974562,2028751986,-383256678,1545430777]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[1516745844,1655284652,-819213693,1666838806]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-583828566,2123861820,-1915377770,-1531182341,1299213599,1653623698,-1379942104,889283884,1516745844,1655284652,-819213693,1666838806]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[623153032,-477105560]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":null,\"totalApproved\":null,\"totalRequired\":null},\"ST641170\":{\"attendanceMetric\":null,\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":null,\"gapDate\":null,\"id\":\"641170\",\"lastContact\":null,\"lastLogin\":null,\"lessonsBehind\":null,\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[-1408163944,647817481,-265466221,1276913060]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[1156614994,1754249677,-1783092831,961047510]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-365240185,-415572845,-1682836143,-1031321653,-71479670,11851033,1368914075,-1239545347,1156614994,1754249677,-1783092831,961047510]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[-394139267,-1779793833]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":null,\"totalApproved\":null,\"totalRequired\":null},\"ST858902\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":null,\"id\":\"858902\",\"lastContact\":null,\"lastLogin\":\"5/21/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":16,\"words\":[-1115642446,-171637043,1351789757,1506234676]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[-987839648,1601336872,-1300820070,-1388459743]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[-1056008280,-614867963,527683376,-1045459475,241983780,984010196,-870809081,1638160319,-987839648,1601336872,-1300820070,-1388459743]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[-1998702620,406561430]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"UL7165649\",\"totalApproved\":null,\"totalRequired\":null},\"ST948801\":{\"attendanceMetric\":\"1\",\"attendanceStatus\":false,\"ccpHours\":null,\"ccpStudent\":null,\"cteHours\":null,\"cteStudent\":null,\"escReason\":\"N/A\",\"escalation\":\"Exempt\",\"firstDay\":\"8/16/2021\",\"gapDate\":\"6/28/2021\",\"id\":\"948801\",\"lastContact\":null,\"lastLogin\":\"8/15/2021\",\"lessonsBehind\":\"0\",\"missingHours\":null,\"name\":{\"$super\":{\"$super\":{}},\"algorithm\":{\"$super\":{\"$super\":{\"$super\":{\"$super\":{},\"_minBufferSize\":0},\"_DEC_XFORM_MODE\":2,\"_ENC_XFORM_MODE\":1,\"cfg\":{\"$super\":{}},\"ivSize\":4,\"keySize\":4},\"blockSize\":4,\"cfg\":{\"$super\":{\"$super\":{}},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{}}},\"keySize\":8},\"blockSize\":4,\"ciphertext\":{\"sigBytes\":32,\"words\":[1729625046,-862973682,1128998343,-805549609,-501486194,-1393687477,2127642134,600885019]},\"formatter\":{},\"iv\":{\"$super\":{\"$super\":{}},\"sigBytes\":16,\"words\":[1568106295,-1753258313,304950409,-1091524646]},\"key\":{\"$super\":{\"$super\":{}},\"sigBytes\":32,\"words\":[442018960,-1886925077,1947982104,-952682243,-462879279,-1573192673,1509189948,2052711277,1568106295,-1753258313,304950409,-1091524646]},\"mode\":{\"$super\":{\"$super\":{}},\"Decryptor\":{\"$super\":null},\"Encryptor\":{\"$super\":null}},\"padding\":{},\"salt\":{\"sigBytes\":8,\"words\":[-1673965063,1509829850]}},\"oldOverdue\":\"-\",\"overdue\":\"-\",\"stateId\":\"BW6733750\",\"totalApproved\":null,\"totalRequired\":null}}");
  */


dataLayer.push({'event':'popup-js-loaded'});