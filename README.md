# Instagram Time Tracker

A Chrome extension that helps you monitor and track your Instagram usage, providing detailed statistics on time spent and reels consumed.

## Features

- **Time Tracking**: Automatically tracks time spent on Instagram with daily and total statistics
- **Reel Monitoring**: Counts reels viewed with unique ID detection to avoid duplicates
- **Real-time Updates**: Statistics update every 30 seconds for accurate tracking
- **Session Management**: Tracks current session time and resets when switching tabs
- **Data Persistence**: All data is stored locally and synchronized with Firebase
- **User Authentication**: Secure Google OAuth2 integration for data backup

## Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) (link will be available after publication)
2. Search for "Instagram Time Tracker"
3. Click "Add to Chrome"
4. Grant necessary permissions

### Manual Installation (Development)
1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your extensions list

## Usage

1. **Login**: Click the extension icon and sign in with your Google account
2. **Browse Instagram**: Simply use Instagram normally - the extension works automatically
3. **View Statistics**: Click the extension icon to see:
   - Total time spent on Instagram
   - Time spent today
   - Total reels viewed
   - Reels viewed today
   - Current session time

## How It Works

### Time Tracking
- Monitors tab activity to detect when Instagram is active
- Tracks time in real-time with 30-second auto-save intervals
- Automatically stops tracking when switching to other tabs
- Resets daily statistics at midnight

### Reel Counting
- Monitors URL changes on Instagram pages
- Detects reel navigation by checking for `/reels/`, `/reel/`, or `/p/` in URLs
- Extracts unique reel IDs to prevent duplicate counting
- Implements 2-second cooldown between counts to ensure accuracy

### Data Storage
- **Local Storage**: Primary storage using Chrome's storage API
- **Firebase Sync**: Optional cloud backup for data persistence across devices
- **Real-time Sync**: Statistics are synchronized every 30 seconds

## Technical Details

### Architecture
- **Content Script**: Monitors Instagram pages for reel navigation
- **Background Service Worker**: Manages time tracking and data synchronization
- **Popup Interface**: Displays statistics and handles user authentication

### Permissions
- `tabs`: Monitor tab activity for time tracking
- `storage`: Store statistics locally
- `identity`: Google OAuth2 authentication
- `host_permissions`: Access to Instagram domains

### Data Structure
```javascript
{
  currentSession: {
    time: 0,        // Current session time in seconds
    reels: 0,       // Reels viewed in current session
    isActive: true  // Whether Instagram is currently active
  },
  todayStats: {
    date: "Mon Dec 16 2024",  // Current date
    time: 318,                // Total time today in seconds
    reels: 21                 // Total reels today
  },
  totalStats: {
    time: 318,    // Total time (mirrors today's stats)
    reels: 21     // Total reels (mirrors today's stats)
  }
}
```

## Privacy & Security

- **Local First**: All data is stored locally on your device
- **Optional Sync**: Firebase sync is optional and requires explicit user consent
- **No Data Collection**: We do not collect or share your personal data
- **Secure Authentication**: Uses Google OAuth2 for secure login
- **Minimal Permissions**: Only requests necessary permissions for functionality

## Development

### Project Structure
```
├── manifest.json          # Extension configuration
├── background.js          # Service worker for time tracking
├── content.js            # Content script for reel detection
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── popup.css             # Popup styling
├── firebase-config.js    # Firebase configuration
├── firebase/             # Firebase SDK files
├── icons/                # Extension icons
└── web-pages/            # Additional web pages
```

### Building
1. Ensure all dependencies are in place
2. Configure Firebase settings in `firebase-config.js`
3. Test the extension in development mode
4. Package for distribution

### Testing
- Test time tracking by switching between Instagram and other tabs
- Test reel counting by navigating through different reels
- Verify data persistence by closing and reopening the extension
- Test authentication flow with Google OAuth2

## Troubleshooting

### Common Issues

**Time not tracking:**
- Ensure Instagram is in an active tab
- Check that the extension has proper permissions
- Try refreshing the Instagram page

**Reels not counting:**
- Navigate to a different reel to trigger detection
- Check browser console for any error messages
- Ensure you're on Instagram.com domain

**Statistics not updating:**
- Wait 30 seconds for auto-save to trigger
- Try opening and closing the extension popup
- Check if data is being saved in Chrome storage

### Reset Statistics
If you need to reset all statistics:
1. Open the extension popup
2. Click "Reset Stats" button
3. Confirm the reset action

## Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, feature requests, or bug reports:
- Create an issue on GitHub
- Contact us through the Chrome Web Store listing
- Check the troubleshooting section above

## Changelog

### Version 1.0.0
- Initial release
- Time tracking functionality
- Reel counting with duplicate prevention
- Google OAuth2 authentication
- Firebase data synchronization
- Real-time statistics display
- Local data storage

---

**Note**: This extension is not affiliated with Instagram or Meta. It's an independent tool designed to help users monitor their Instagram usage.