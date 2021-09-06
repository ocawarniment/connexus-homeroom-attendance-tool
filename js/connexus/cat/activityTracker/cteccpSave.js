// save 
document.querySelector('.cxPrimaryBtn').click();

// open a new page with the activity log, save
const query = location.search;
const regex = /.*(?=\&(cte|ccp))/g;
const baseQuery = query.match(regex)[0];
chrome.runtime.sendMessage({type: 'activityLogOpenAndSave', attendanceParams: baseQuery});

// close the activity tracker tab
window.close();