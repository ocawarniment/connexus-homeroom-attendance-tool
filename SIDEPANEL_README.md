# React Sidepanel for CHAT Extension

This document explains the new React-based sidepanel that provides a modern alternative to the popup interface.

## Features

- **Modern React UI**: Clean, responsive interface built with React 18
- **Chrome Sidepanel API**: Uses the new Chrome sidepanel for better user experience
- **Full Feature Parity**: All popup functionality replicated in the sidepanel
- **Improved UX**: Better layout, modern styling, and enhanced interactions

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the React App

```bash
npm run build
```

Or use the provided script:

```bash
./build-sidepanel.sh
```

The build output will be placed in the `dist/` folder:
- `dist/js/sidepanel/bundle.js` - The compiled React sidepanel

### 3. Load Extension

1. Load the extension in Chrome (chrome://extensions/)
2. Enable Developer mode
3. Click "Load unpacked" and select the extension directory

### 4. Use the Sidepanel

**Option A: Right-click method**
1. Right-click on the extension icon in the toolbar
2. Select "Open side panel"

**Option B: Programmatic method**
- The sidepanel can be opened programmatically via background script messages

## File Structure

```
js/sidepanel/               # Source files
├── index.js              # React app entry point
├── App.js                # Main app component
├── hooks/
│   └── useExtensionData.js # Custom hook for Chrome extension data
└── components/
    ├── Header.js          # Header with logo and settings button
    ├── DownloadSection.js # Section download form
    ├── StudentTable.js    # Student data table
    ├── StudentRow.js      # Individual student row
    ├── StudentDropdown.js # Student action dropdown
    └── SettingsPanel.js   # Settings panel (slides in from right)

dist/                      # Build output (ignored by git)
└── js/sidepanel/
    └── bundle.js         # Compiled React bundle
```

## Key Components

### Header
- Displays school logo
- Shows extension title
- Settings button to open settings panel

### Download Section
- Section ID input
- Date range picker with auto/manual modes
- Download button with loading state
- Last sync information
- Date mode banner (auto/manual toggle)

### Student Table
- Responsive table layout
- Configurable columns based on user settings
- Student action buttons (approve/info)
- Student dropdown menus with quick links
- Empty state when no students loaded

### Settings Panel
- Slides in from the right
- All original popup settings:
  - School selection (OCA/GRCA)
  - Approval window configuration
  - Table field selection
  - Lesson completion measure (OCA only)
  - LiveLesson default subject
  - Version information and updates

## Technical Details

### State Management
- Uses React hooks for state management
- Custom `useExtensionData` hook handles Chrome extension APIs
- Settings are persisted to Chrome storage

### Chrome Extension Integration
- Full integration with existing background script
- Uses Chrome storage API for data persistence
- Maintains compatibility with existing content scripts
- Supports all existing functionality (roster download, attendance approval, etc.)

### Styling
- Modern CSS with CSS Grid and Flexbox
- Responsive design that works in the sidepanel
- Clean, accessible interface
- Consistent with modern web app design patterns

### Build Process
- Webpack for bundling React components
- Babel for JSX transformation
- Development and production build modes

## Development

### Development Mode
```bash
npm run dev
```
This will watch for changes and rebuild automatically.

### Production Build
```bash
npm run build
```
Creates optimized bundle for production use.

## Migration from Popup

The sidepanel provides the same functionality as the original popup but with several improvements:

1. **Better Space Utilization**: Sidepanel provides more room for the student table
2. **Persistent Interface**: Stays open while working with other tabs
3. **Modern UI**: Clean, modern design with better accessibility
4. **Enhanced Settings**: Settings panel slides in smoothly without modal dialogs
5. **Improved Responsiveness**: Better handling of different screen sizes

## Compatibility

- **Chrome Version**: Requires Chrome 114+ (for sidepanel API)
- **Manifest V3**: Fully compatible with Manifest V3
- **Existing Features**: All existing extension functionality preserved
- **Data Format**: Uses same data structures as original popup

## Future Enhancements

Potential improvements for future versions:

1. **Real-time Updates**: Live updates when data changes
2. **Keyboard Shortcuts**: Hotkeys for common actions
3. **Advanced Filtering**: Filter and search students
4. **Bulk Actions**: Select multiple students for batch operations
5. **Dark Mode**: Theme switching support
6. **Accessibility**: Enhanced screen reader support

## Troubleshooting

### Build Issues
- Ensure Node.js and npm are installed
- Run `npm install` to install dependencies
- Check for any error messages during build
- Verify the `dist/` folder is created after build

### Extension Loading
- Verify manifest.json includes sidepanel permissions
- Ensure bundle.js is generated in `dist/js/sidepanel/`
- Check Chrome developer console for errors
- Make sure sidepanel.html references the correct bundle path

### Functionality Issues
- Verify Chrome storage permissions
- Check background script console for errors
- Ensure content scripts are still working

## Support

For issues or questions about the sidepanel implementation, check:

1. Chrome extension developer console
2. Background script logs
3. React component error boundaries
4. Chrome storage data integrity