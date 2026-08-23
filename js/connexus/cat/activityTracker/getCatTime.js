let loadAttempts = 0;
let reportedFailure = false;

function reportCourseActivityFailure(reason) {
    if (reportedFailure) return;
    reportedFailure = true;
    console.warn('[CHAT activity data] Course activity data is unavailable.', { reason });
    chrome.runtime.sendMessage({ type: 'courseActivityError', reason });
}

function dateFromQuery(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getDateRange() {
    const params = new URLSearchParams(window.location.search);
    const startDate = dateFromQuery(params.get('startDate'));
    const endDate = dateFromQuery(params.get('endDate'));
    if (startDate && endDate && endDate >= startDate) return { startDate, endDate };

    const rangeText = document.querySelector('h2.ng-binding')?.textContent?.trim();
    const [startText, endText] = rangeText?.split(' - ') || [];
    const fallbackStart = startText ? new Date(startText) : null;
    const fallbackEnd = endText ? new Date(endText) : null;
    if (fallbackStart && fallbackEnd && !Number.isNaN(fallbackStart.getTime()) && !Number.isNaN(fallbackEnd.getTime())) {
        return { startDate: fallbackStart, endDate: fallbackEnd };
    }
    return null;
}

function formatDate(date) {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function hhmmToHMin(hhmm) {
    const match = String(hhmm).match(/(\d+)\s*:\s*(\d+)/);
    return match ? `${parseInt(match[1], 10)}h ${parseInt(match[2], 10)}min` : null;
}

function getCellTime(cell) {
    const input = cell?.querySelector('input');
    if (input?.value) return hhmmToHMin(input.value);
    const text = cell?.textContent?.trim();
    if (!text) return null;
    const minutes = text.match(/(\d+)\s*min/i)?.[1];
    const hours = text.match(/(\d+)\s*hr/i)?.[1];
    return minutes || hours ? `${hours || 0}h ${minutes || 0}min` : null;
}

async function getCatTime() {
    try {
        const range = getDateRange();
        const courseRows = [...document.querySelectorAll('tr[ng-repeat*="activity"]')];
        if (!range || !courseRows.length) {
            reportCourseActivityFailure('The Activity Tracker course grid did not load.');
            return;
        }

        const courseNames = [...document.querySelectorAll('th.course-name')]
            .map(cell => cell.textContent.trim())
            .filter(Boolean);
        const results = {};
        const daysBetween = Math.round((range.endDate.getTime() - range.startDate.getTime()) / 86400000);

        for (let column = 0; column <= daysBetween; column += 1) {
            const date = new Date(range.startDate);
            date.setDate(date.getDate() + column);
            const courseTime = [];

            courseRows.forEach((courseRow, row) => {
                const time = getCellTime(courseRow.querySelectorAll('td')[column]);
                if (time) courseTime.push({ course: courseNames[row] || 'Course Activity', time });
            });

            const dateString = formatDate(date);
            results[dateString] = { date: dateString, courseTime };
        }

        await chrome.storage.local.set({ catTime: results });
        await chrome.runtime.sendMessage({ type: 'loadCatTime', closeSender: true });
    } catch (error) {
        reportCourseActivityFailure(error.message || 'The Activity Tracker could not be read.');
    }
}

function checkLoaded() {
    const hasCourseGrid = document.querySelectorAll('tr[ng-repeat*="activity"]').length > 0;
    if (!hasCourseGrid && loadAttempts < 10) {
        loadAttempts += 1;
        setTimeout(checkLoaded, 500);
        return;
    }
    getCatTime();
}

checkLoaded();
