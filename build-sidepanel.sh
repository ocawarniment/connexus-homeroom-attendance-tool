#!/bin/bash

# Build script for React sidepanel

echo "Installing dependencies..."
npm install

echo "Cleaning previous build..."
npm run clean

echo "Building React sidepanel..."
npm run build

echo "Build complete! The sidepanel bundle is now in dist/js/sidepanel/bundle.js"
echo ""
echo "To use the sidepanel:"
echo "1. Load the extension in Chrome"
echo "2. Right-click on the extension icon"
echo "3. Select 'Open side panel'"
echo ""
echo "The build output is now organized in the dist/ folder:"
echo "- dist/js/sidepanel/bundle.js - React sidepanel bundle"
echo ""
echo "Note: The dist/ folder is ignored by git as specified in .gitignore"