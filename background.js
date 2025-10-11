/**
 * Instagram Time Tracker - Background Service Worker
 * Manages tab activity monitoring, time tracking, and data synchronization
 */
class BackgroundManager {
    constructor() {
        this.isInstagramActive = false;
        this.currentTabId = null;
        this.sessionStartTime = null;
        this.sessionTime = 0;
        this.reelsCount = 0;
        this.timer = null;
        this.syncInterval = null;
        this.autoSaveInterval = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startSyncInterval();
        this.loadStoredData();
    }

    setupEventListeners() {
        // Listen for tab activation
        chrome.tabs.onActivated.addListener((activeInfo) => {
            this.handleTabActivation(activeInfo.tabId);
        });

        // Listen for tab updates (URL changes)
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                this.handleTabUpdate(tabId, tab);
            }
        });

        // Listen for tab removal
        chrome.tabs.onRemoved.addListener((tabId) => {
            if (tabId === this.currentTabId) {
                this.stopTracking();
            }
        });

        // Listen for messages from content script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleContentScriptMessage(message, sender);
        });

        // Listen for extension startup
        chrome.runtime.onStartup.addListener(() => {
            this.loadStoredData();
        });

    }

    async handleTabActivation(tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            this.checkIfInstagramTab(tab);
        } catch (error) {
            console.error('Error getting tab info:', error);
        }
    }

    async handleTabUpdate(tabId, tab) {
        this.checkIfInstagramTab(tab);
    }

    checkIfInstagramTab(tab) {
        const isInstagram = tab.url && tab.url.includes('instagram.com');
        
        
        if (isInstagram && !this.isInstagramActive) {
            this.startTracking(tab.id);
        } else if (!isInstagram && this.isInstagramActive) {
            this.stopTracking();
        }
    }

    startTracking(tabId) {
        
        this.isInstagramActive = true;
        this.currentTabId = tabId;
        this.sessionStartTime = Date.now();
        
        // Start timer
        this.timer = setInterval(() => {
            this.updateSessionTime();
        }, 1000);

        // Save session start
        this.saveCurrentSession();
    }

    stopTracking() {
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        // Save time when stopping tracking
        if (this.sessionTime > 0) {
            this.saveTimeToStats();
        } else {
        }

        this.isInstagramActive = false;
        this.currentTabId = null;
        this.sessionStartTime = null;
        this.sessionTime = 0;
        this.reelsCount = 0;
    }

    updateSessionTime() {
        if (this.isInstagramActive && this.sessionStartTime) {
            this.sessionTime = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            this.saveCurrentSession();
        }
    }

    handleContentScriptMessage(message, sender, sendResponse) {
        if (message.type === 'count_reel') {
            this.countReel();
            sendResponse({ success: true });
        }
    }

    async countReel() {
        try {
            // Get current session data
            const result = await chrome.storage.local.get(['currentSession', 'todayStats', 'totalStats']);
            const currentSession = result.currentSession || { time: 0, reels: 0, isActive: true };
            const todayStats = result.todayStats || { date: '', time: 0, reels: 0 };
            const totalStats = result.totalStats || { time: 0, reels: 0 };
            
            // Increment reel count in session
            currentSession.reels = (currentSession.reels || 0) + 1;
            
            // Update today's stats
            const today = new Date().toDateString();
            if (todayStats.date === today) {
                todayStats.reels += 1;
            } else {
                todayStats.date = today;
                todayStats.reels = 1;
                todayStats.time = 0;
            }
            
            // Update total stats - make it a mirror of today's stats
            totalStats.reels = todayStats.reels;
            
            // Save all data
            await chrome.storage.local.set({ 
                currentSession, 
                todayStats, 
                totalStats 
            });
            
            
        } catch (error) {
            console.error('❌ Error counting reel:', error);
        }
    }

    async saveCurrentSession() {
        const sessionData = {
            time: this.sessionTime,
            reels: this.reelsCount,
            isActive: this.isInstagramActive
        };

        await chrome.storage.local.set({ currentSession: sessionData });
    }


    async saveTimeToStats() {
        if (this.sessionTime === 0) return;
        
        try {
            const result = await chrome.storage.local.get(['todayStats', 'totalStats']);
            const todayStats = result.todayStats || { date: '', time: 0, reels: 0 };
            const totalStats = result.totalStats || { time: 0, reels: 0 };
            
            const today = new Date().toDateString();
            
            // Update today's time
            if (todayStats.date === today) {
                todayStats.time += this.sessionTime;
            } else {
                todayStats.date = today;
                todayStats.time = this.sessionTime;
                // Don't reset reels - they're handled by content script
            }
            
            // Update total time - make it a mirror of today's time
            totalStats.time = todayStats.time;
            
            await chrome.storage.local.set({ todayStats, totalStats });
            
            // Verify the data was saved
            const verifyResult = await chrome.storage.local.get(['todayStats', 'totalStats']);
            
            // Reset session time after saving to avoid double counting
            this.sessionTime = 0;
            this.sessionStartTime = Date.now();
            
        } catch (error) {
            console.error('❌ Error saving time:', error);
        }
    }

    async loadStoredData() {
        try {
            const result = await chrome.storage.local.get(['currentSession', 'totalStats', 'todayStats']);
            
            if (result.currentSession) {
                this.sessionTime = result.currentSession.time || 0;
                this.reelsCount = result.currentSession.reels || 0;
            }


            // Sync total stats with today's stats
            await this.syncTotalWithToday();

        } catch (error) {
            console.error('Error loading stored data:', error);
        }
    }

    async syncTotalWithToday() {
        try {
            const result = await chrome.storage.local.get(['todayStats', 'totalStats']);
            const todayStats = result.todayStats || { date: '', time: 0, reels: 0 };
            const totalStats = result.totalStats || { time: 0, reels: 0 };
            
            // Make total stats mirror today's stats
            totalStats.time = todayStats.time;
            totalStats.reels = todayStats.reels;
            
            await chrome.storage.local.set({ totalStats });
            
        } catch (error) {
            console.error('❌ Error syncing total with today:', error);
        }
    }

        startSyncInterval() {
            // Sync with Firebase every 5 minutes
            this.syncInterval = setInterval(() => {
                this.syncWithFirebase();
            }, 5 * 60 * 1000);
            
            // Auto-save stats every 30 seconds when Instagram is active
            this.autoSaveInterval = setInterval(() => {
                this.autoSaveStats();
            }, 30 * 1000); // Changed from 2 minutes to 30 seconds
        }

        async autoSaveStats() {
            
            if (this.isInstagramActive && this.sessionTime > 0) {
                await this.saveTimeToStats();
                
                // DON'T reset session time - keep it running
                // The session time will continue to accumulate
            } else {
            }
        }

    async syncWithFirebase() {
        try {
            const result = await chrome.storage.local.get(['currentUser', 'totalStats', 'todayStats']);
            const currentUser = result.currentUser;
            const totalStats = result.totalStats;
            const todayStats = result.todayStats;

            if (!currentUser || !totalStats) {
                return;
            }

            
            // Try to send message to popup, but don't fail if popup is not open
            try {
                await chrome.runtime.sendMessage({
                    type: 'sync_data',
                    data: { currentUser, totalStats, todayStats }
                });
            } catch (error) {
            }
            
        } catch (error) {
            console.error('❌ Error syncing with Firebase:', error);
        }
    }
}

// Initialize background manager
new BackgroundManager();
