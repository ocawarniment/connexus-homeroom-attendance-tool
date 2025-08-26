/////// Function declarations ////////
// function to format dates to mm/dd/yyyy
function formatDate(date) {
	var dateString = date.toString();
	var splitDateString = dateString.split("-");
	return splitDateString[1] + "/" + splitDateString[2] + "/" + splitDateString[0];
}

// additional functions from page source recreated
function hidePicker(pickerType) {
	document.getElementById(pickerType + '_ToggleIcon').childNodes[0].src = "/images/silverRightArrow.gif";
	document.getElementById(pickerType + '_PickListInnerContent').style.display = "none";
	document.getElementById(pickerType + '_innerBottomContent').style.display = "none";
}
function showPicker(pickerType) {
	document.getElementById(pickerType + '_ToggleIcon').childNodes[0].src = "/images/silverDownArrow.gif";
	document.getElementById(pickerType + '_PickListInnerContent').style.display = "";
	document.getElementById(pickerType + '_innerBottomContent').style.display = "";
}

// modified addMultiPickItem function for section
function addSection(id) {
	let sections = window.section_Array;

	document.getElementById('section_linkSpan_' + id).style.display = "none";
	document.getElementById('section_chosenLinkSpan_' + id).style.display = "";
	sections.push(id);
}

// message to background console
function bgConsole(sendCommand) {
	chrome.runtime.sendMessage({type: 'console', command: sendCommand});
}
// chrome local
//var storage = chrome.storage.local;

// scrape data from URL
let url = window.location.href;

// Create a URL object from the string
const urlObj = new URL(url);
// Get the URLSearchParams object, which allows you to access parameters
const params = urlObj.searchParams;
// Use the .get() method to retrieve the value of 'sectionId'
const sectionId = params.get('sectionId');
const adjStr = params.get('adjStr').replaceAll(' ','+');
const appWindow = params.get('appWindow').replace('-',' - ');
// work counts
const workMatch = params.get('workNumbers').match(/L(\d+)\|A(\d+)/);
const lessonCount = parseInt(workMatch[1]);
const assessmentCount = parseInt(workMatch[2]);

//storage.get(null, function(result) {
	// try to click the correct section
	let currentSystem = document.querySelector('#system_systemDropDownList > option[selected="selected"]').innerText;

	console.log('HERE')

	// assume system is not Student - set it and wait for loading to disappear
	// Select the dropdown element
	const systemDropdown = document.querySelector('select[name="system$systemDropDownList"]');
		
	// Set the dropdown to "System" option
	systemDropdown.value = '1'; // This will select the "Choose One" option

	// Trigger the change event to simulate user interaction
	systemDropdown.dispatchEvent(new Event('change'));

	// Create a function to wait for an element to become visible
	function waitForElementVisibility(selector, shouldBeVisible) {
		return new Promise((resolve) => {
			// Create a MutationObserver to watch for style changes
			const observer = new MutationObserver((mutations) => {
				const element = document.querySelector(selector);
				if (element) {
					// Check if the element's visibility matches the desired state
					const isVisible = window.getComputedStyle(element).display !== 'none' && 
									element.offsetParent !== null;
					
					if (isVisible === shouldBeVisible) {
						observer.disconnect();
						resolve();
					}
				}
			});

			// Configure the observer to watch for style and attribute changes
			observer.observe(document.body, {
				attributes: true,
				childList: true,
				subtree: true
			});

			// Initial check in case the state is already as expected
			const initialCheck = () => {
				const element = document.querySelector(selector);
				if (element) {
					const isVisible = window.getComputedStyle(element).display !== 'none' && 
									element.offsetParent !== null;
					
					if (isVisible === shouldBeVisible) {
						observer.disconnect();
						resolve();
					}
				}
			};

			initialCheck();
		});
	}

	// Wait for the loading block to become visible, then invisible
	(async () => {
		console.log('waiting');
		await waitForElementVisibility('#home > div.cxLoading.cxLoadingOverlay.cxLoadingVisible > div', true);
		await waitForElementVisibility('#home > div.cxLoading.cxLoadingOverlay.cxLoadingVisible > div', false);
		//await waitForElementVisibility('div.blockUI.blockMsg.blockPage img', true);
		//await waitForElementVisibility('div.blockUI.blockMsg.blockPage img', false);
		console.log('finished');

		// click comment observation
		var catBox = document.getElementById("idLogEntryContactType_ctl00");
		catBox.selectedIndex = 1; //hard coded to get the 1 index which is comment
		var contacteesPanel = document.getElementById('contacteesPanel');
		contacteesPanel.setAttribute('style', 'display:none');
		
		var attenBox = document.getElementById("areaCategoryChooser_pickList_pickListContaner").getElementsByClassName("rtLI")[66].getElementsByTagName("span")[1]; //[1].getElementsByClassName("rtUnchecked")[1];
		
		var drop=document.getElementById("areaCategoryChooser_pickList_ToggleIcon"); 
		var allCats = document.getElementById("areaCategoryChooser_pickList_tree").getElementsByClassName("rtLI");
		
		// get the items we need
		var adminDrop = getCat("Administrative").getElementsByClassName("rtPlus")[0];
		var adminBox = getItem("Administrative","Administrative").getElementsByClassName("rtUnchecked")[0];
		var attenBox = getItem("Administrative","Attendance").getElementsByClassName("rtUnchecked")[0];

		// clear cats
		i=0;
		while (i<allCats.length) {
			if(allCats[i].getElementsByTagName("span")[1].getAttribute("class") == "rtChecked") {
				allCats[i].getElementsByTagName("span")[1].click();
			}
			i++;
		}

		// click boxes
		drop.click(); 
		adminDrop.click(); 
		window.setTimeout(function(){
			adminBox.click(); 
			attenBox.click();
			drop.click(); 
		}, 250); 
		

		//var changesText = adjStr;

		let changesArray = adjStr.split(';').filter(Boolean).map(entry => {
			// Regex to extract MMDDYY, sign, hours, and minutes
			let match = entry.match(/(\d{2})(\d{2})(\d{2})([+-])(\d{2})h(\d{2})m/);
			
			if (match) {
				let month = parseInt(match[1], 10);
				let day = parseInt(match[2], 10);
				let year = `20${match[3]}`;
				let sign = match[4];
				let hours = parseInt(match[5], 10);
				let minutes = parseInt(match[6], 10);
			
				// Format the date part
				let datePart = `${month}/${day}/${year}`;
			
				// Format the time adjustment part
				let hoursPart = `${hours}h`;
				let minutesPart = `${minutes}min`;
				let timeAdjustmentPart = `Time Adjustment ${sign}${hoursPart} ${minutesPart}`;
			
				return `${datePart} - ${timeAdjustmentPart}`;
			}
		});

		console.log(changesArray);

		let changesString = changesArray.join('\n');

		if (changesArray.length > 0) {
			document.querySelector('#comment').innerHTML = "Attendance Adjustments \n" + appWindow + "\n\n" + 'Lessons: ' + lessonCount + "\n" + 'Assessments: ' + assessmentCount + "\n\n" + changesString;
		} else {
			alert("No changes!");
		}

		// add the homeroom section last in case this is not a hr teacher
		showPicker('section');
		console.log('clicked!');
		addSection(sectionId);

		console.log('DONE');
	})();

//});

// function to get cat open item
function getCat(category){
	// get the category index
	var allCategories = document.getElementById("areaCategoryChooser_pickList_tree").getElementsByClassName("rtUL")[0].children;
	var foundCat;
	
	for(i=0; i<allCategories.length; i++){
		var catString = allCategories[i].innerText;
		if(catString.includes(category)) {
			foundCat = allCategories[i];
		}
	}

	return foundCat;
}

// function to find the right toggle box
function getItem(category, item){
	// get the category index
	var allCategories = document.getElementById("areaCategoryChooser_pickList_tree").getElementsByClassName("rtUL")[0].children;
	var foundCat;
	
	for(i=0; i<allCategories.length; i++){
		var catString = allCategories[i].innerText;
		if(catString.includes(category)) {
			foundCat = allCategories[i];
		}
	}

	var allItems = foundCat.getElementsByClassName("rtLI");
	var foundItem;
	// find the correct item within the found category
	for(i=0; i<allItems.length; i++){
		var itemString = allItems[i].innerText;
		if(itemString.includes(item)){
			foundItem = allItems[i];
		}
	}

	return foundItem;

}	
	
