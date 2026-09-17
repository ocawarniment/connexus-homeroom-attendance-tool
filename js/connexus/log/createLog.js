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

function findSelectWithOption(optionText) {
	return Array.from(document.querySelectorAll('select')).find(select =>
		Array.from(select.options).some(option => option.textContent.trim().toLowerCase().includes(optionText.toLowerCase()))
	);
}

function selectOptionContaining(select, optionText) {
	if (!select) throw new Error(`The ${optionText} selector is not available on this log form.`);
	let option = Array.from(select.options).find(item => item.textContent.trim().toLowerCase().includes(optionText.toLowerCase()));
	if (!option) throw new Error(`The ${optionText} option is not available on this log form.`);
	select.value = option.value;
	select.dispatchEvent(new Event('change', { bubbles: true }));
}

function setTreeCheckbox(item, checked) {
	if (!item) throw new Error('An expected attendance category is not available on this log form.');
	let checkbox = item.querySelector('.rtChecked, .rtUnchecked, .rtIndeterminate');
	if (!checkbox) throw new Error('An expected attendance category checkbox is not available on this log form.');
	let isChecked = checkbox.classList.contains('rtChecked');
	if (isChecked !== checked) checkbox.click();
}

function directTreeLabel(item) {
	let row = item?.firstElementChild;
	let label = row ? Array.from(row.children).find(child => child.classList.contains('rtIn')) : null;
	return label?.childNodes[0]?.textContent.trim() || '';
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
const isEmptyLogTest = params.get('emptyLogTest') === 'true';
// work counts
const workMatch = params.get('workNumbers').match(/L(\d+)\|A(\d+)/);
const lessonCount = parseInt(workMatch[1]);
const assessmentCount = parseInt(workMatch[2]);

//storage.get(null, function(result) {
	console.log('HERE')

	// The student log form normally opens with Student already selected. Only
	// trigger Connexus's postback when another system is actually selected.
	const systemDropdown = document.querySelector('select[name="system$systemDropDownList"]');
	if (!systemDropdown) throw new Error('The System selector is not available on this log form.');
	const changeToStudent = systemDropdown.value !== '1';
	if (changeToStudent) {
		systemDropdown.value = '1';
		systemDropdown.dispatchEvent(new Event('change', { bubbles: true }));
	}

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
		if (changeToStudent) {
			console.log('waiting');
			await waitForElementVisibility('#home > div.cxLoading.cxLoadingOverlay.cxLoadingVisible > div', true);
			await waitForElementVisibility('#home > div.cxLoading.cxLoadingOverlay.cxLoadingVisible > div', false);
			console.log('finished');
		}

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
		let comment = document.querySelector('#comment');
		if (!comment) throw new Error('The comment field is not available on this log form.');

		if (changesArray.length > 0) {
			comment.value = "Attendance Adjustments \n" + appWindow + "\n\n" + 'Lessons: ' + lessonCount + "\n" + 'Assessments: ' + assessmentCount + "\n\n" + changesString;
		} else if (isEmptyLogTest) {
			comment.value = "Attendance Adjustments \n" + appWindow + "\n\n" + 'Lessons: ' + lessonCount + "\n" + 'Assessments: ' + assessmentCount + "\n\nDeveloper test: no attendance adjustments were found.";
		} else {
			alert("No changes!");
		}
		comment.dispatchEvent(new Event('input', { bubbles: true }));
		comment.dispatchEvent(new Event('change', { bubbles: true }));

		// Select Comment by its visible option text instead of relying on a
		// Connexus-generated control ID or option index.
		let contactType = document.getElementById("idLogEntryContactType_contactType") || findSelectWithOption('Comment / Observation');
		selectOptionContaining(contactType, 'Comment');
		let contacteesPanel = document.getElementById('contacteesPanel');
		if (contacteesPanel) contacteesPanel.style.display = 'none';

		let categoryTree = document.getElementById("areaCategoryChooser_pickList_tree");
		let categoryToggle = document.getElementById("areaCategoryChooser_pickList_ToggleIcon");
		if (!categoryTree || !categoryToggle) throw new Error('The Areas and Categories picker is not available on this log form.');

		// Clear prior selections, then choose categories by name. The previous
		// implementation assumed Attendance was always item 67 in the tree.
		Array.from(categoryTree.getElementsByClassName("rtLI")).forEach(item => {
			let checkbox = item.querySelector('.rtChecked');
			if (checkbox) checkbox.click();
		});
		categoryToggle.click();
		let administrativeCategory = getCat("Administrative");
		let adminExpand = administrativeCategory?.querySelector('.rtPlus');
		if (adminExpand) adminExpand.click();
		await new Promise(resolve => window.setTimeout(resolve, 250));
		setTreeCheckbox(getItem("Administrative", "Administrative"), true);
		setTreeCheckbox(getItem("Administrative", "Attendance"), true);
		categoryToggle.click();

		// add the homeroom section last in case this is not a hr teacher
		let sectionAddLink = document.getElementById('section_linkSpan_' + sectionId)?.querySelector('a');
		if (!sectionAddLink) throw new Error(`Section ${sectionId} is not available on this log form.`);
		sectionAddLink.click();

		console.log('DONE');
	})().catch(error => {
		console.error('CHAT Create Log automation failed:', error);
		alert(`CHAT could not finish preparing this log entry: ${error.message}`);
	});

//});

// function to get cat open item
function getCat(category){
	var rootList = document.querySelector('#areaCategoryChooser_pickList_tree > ul.rtUL');
	return Array.from(rootList?.children || []).find(item => directTreeLabel(item) === category);
}

// function to find the right toggle box
function getItem(category, item){
	var categoryNode = getCat(category);
	var childList = categoryNode?.querySelector(':scope > ul.rtUL');
	return Array.from(childList?.children || []).find(child => directTreeLabel(child) === item);

}
	
