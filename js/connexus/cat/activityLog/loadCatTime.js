chrome.storage.local.get(null, (result) => {
    const catTime = result.catTime;
    var dateCells = document.querySelectorAll('[id*="activityDate"]');
    const tableRows = document.querySelectorAll('tbody > tr');
    let missCount = 0;
    dateCells.forEach(cell => {
        var dateString = cell.innerText;
        // try to find the date
        try{
            if(catTime[dateString].courseTime.length > 0){
                var dateRows = [];
                // date is present; transfer the time
                var timeArr = catTime[cell.innerText].courseTime;
                // get the adjacent cells with the course activity
                var dateSpanRow = cell.closest('tr.date-header-row');
                var rowSpan = parseInt(dateSpanRow.children[0].getAttribute('rowSpan'));
                // get the index
                var startIndex = [].indexOf.call(tableRows, dateSpanRow);
                var endIndex = parseInt(startIndex) + parseInt(rowSpan);
                var n=0;
                var adjMax = 0;
                if(tableRows[endIndex-1].children[1].innerText == 'Time Adjustment') {adjMax = 1;}
                for(var i=startIndex+1; i<endIndex-1-adjMax; i++){
                    tableRows[i].children[1].innerText = catTime[dateString].courseTime[n].course;
                    tableRows[i].children[2].children[0].innerText = catTime[dateString].courseTime[n].time;
                    n++;
                }
            }
        } catch(err) {
            // date wasnt found
            missCount++;
        }
    })
    console.log(missCount);
    if(missCount>0) {
        let alert = document.createElement('div');
        alert.innerText = 'Since the CAT can only display a single week at a time, some items will remain as "Course Activity" as they were not accesibile on the CAT for this approval window.';
        alert.setAttribute('style','color: #D31717; text-align: center; padding-top: 15px;');
        document.querySelector('#weekSnapshot').appendChild(alert)
    }
})