# Developer Mode Feature

## Overview
The Developer Mode feature provides additional settings and functionality for advanced users and developers working with the CHAT Extension.

## Activation
To activate Developer Mode:
1. Open the Settings panel by clicking the settings icon in the header
2. Click the "About" info icon (ℹ️) **10 times in a row**
3. You will see a notification confirming "Developer Mode activated!"
4. A new "Developer Settings" card will appear after the About section

## Developer Settings

### Download All Students Regardless of Stage
- **Default**: Unchecked (disabled)
- **Description**: When enabled, the extension will download all students from a section regardless of their stage (In Progress, Completed, etc.)
- **Normal Behavior**: Only students with "In Progress" stage are downloaded
- **Developer Behavior**: All students are downloaded, including those with other stages like "Completed", "Withdrawn", etc.

### Redact Student Names
- **Default**: Unchecked (disabled)
- **Description**: When enabled, all student names in the sidepanel table are replaced with "Student Name" to protect PII during screenshots or demonstrations
- **Normal Behavior**: Student names are decrypted and displayed as "LAST, FIRST"
- **Developer Behavior**: All student names show as "Student Name" regardless of their actual names
- **Use Case**: Perfect for creating screenshots, demos, or training materials without exposing student personal information

### Randomize Overdue Lesson Counts
- **Default**: Unchecked (disabled)
- **Description**: When enabled, randomizes the `totalOverdueLessons` attribute for all students in the API response before processing
- **Normal Behavior**: Uses actual overdue lesson counts from the Connexus API
- **Developer Behavior**: Replaces each student's `totalOverdueLessons` with a random number between 1-100
- **Use Case**: Useful for testing, demonstrations, or training without exposing real student performance data

## Technical Implementation

### Frontend Changes
- Added click counter to the About section's info icon
- Added Developer Settings card with orange border styling
- Added checkbox for "Download All Students Regardless of Stage"
- Added checkbox for "Redact Student Names"
- Added checkbox for "Randomize Overdue Lesson Counts"
- Settings are persisted in Chrome storage under `userSettings.developerMode`, `userSettings.downloadAllStudents`, `userSettings.redactStudentNames`, and `userSettings.randomizeOverdueCounts`

### Backend Changes
- Modified `js/connexus/sections/getRoster.js` to check for the `downloadAllStudents` setting
- When enabled, students are included regardless of their `sectionStage` value
- Added console logging for debugging when developer mode is active
- Modified `js/sidepanel/components/StudentRow.js` to check for the `redactStudentNames` setting
- When enabled, the `decryptName` function returns "Student Name" instead of the actual decrypted name
- Modified `js/connexus/myStudents/getOverdue.js` to check for the `randomizeOverdueCounts` setting
- When enabled, randomizes the `totalOverdueLessons` attribute for all students with values between 1-100

## Usage Notes
- Developer Mode persists across browser sessions
- The setting affects the `getRoster()` function behavior when downloading student rosters
- Useful for testing, debugging, or accessing historical student data
- Console logs will show when developer mode features are active

## Security Considerations
- Developer Mode is intended for advanced users and developers
- The 10-click activation prevents accidental enabling
- All data handling follows the same encryption and security practices as normal mode