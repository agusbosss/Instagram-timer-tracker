/**
 * Instagram Time Tracker - Content Script
 * Monitors Instagram page for reel navigation and tracks usage statistics
 */
class InstagramTracker {
    constructor() {
        this.lastReelId = null;
        this.lastCountTime = 0;
        this.countCooldown = 2000; // 2 second cooldown between counts
        this.init();
    }

    init() {
        this.setupSimpleReelDetection();
    }

    /**
     * Sets up URL monitoring to detect reel navigation
     * Checks for URL changes every 500ms to catch Instagram's SPA navigation
     */
    setupSimpleReelDetection() {
        let lastUrl = location.href;
        
        setInterval(() => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                this.handleUrlChange(currentUrl);
            }
        }, 500);
    }

    /**
     * Handles URL changes and determines if a new reel should be counted
     * @param {string} newUrl - The new URL that was navigated to
     */
    handleUrlChange(newUrl) {
        if (this.isReelUrl(newUrl)) {
            const reelId = this.extractReelId(newUrl);
            
            if (reelId && reelId !== this.lastReelId) {
                const now = Date.now();
                const timeSinceLastCount = now - this.lastCountTime;
                
                // Only count if enough time has passed since last count
                if (timeSinceLastCount >= this.countCooldown) {
                    this.lastReelId = reelId;
                    this.lastCountTime = now;
                    this.countReel();
                }
            }
        }
    }

    /**
     * Determines if a URL represents a reel or post
     * @param {string} url - The URL to check
     * @returns {boolean} - True if the URL is a reel/post
     */
    isReelUrl(url) {
        return url.includes('/reels/') || url.includes('/reel/') || url.includes('/p/');
    }

    /**
     * Extracts the unique ID from a reel/post URL
     * @param {string} url - The URL to extract ID from
     * @returns {string|null} - The extracted ID or null if not found
     */
    extractReelId(url) {
        const match = url.match(/\/(?:reels|p)\/([^\/\?]+)/);
        return match ? match[1] : null;
    }


    /**
     * Counts a new reel by updating storage statistics
     */
    async countReel() {
        try {
            await this.countReelDirectly();
        } catch (error) {
            console.error('Error counting reel:', error);
        }
    }

    /**
     * Directly updates storage with new reel count
     * Updates session, today's stats, and total stats
     */
    async countReelDirectly() {
        try {
            const result = await chrome.storage.local.get(['currentSession', 'todayStats', 'totalStats']);
            
            const currentSession = result.currentSession || { time: 0, reels: 0, isActive: true };
            const todayStats = result.todayStats || { date: '', time: 0, reels: 0 };
            const totalStats = result.totalStats || { time: 0, reels: 0 };
            
            // Increment session reel count
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
            
            // Update total stats to mirror today's stats
            totalStats.reels = todayStats.reels;
            
            // Save all data
            await chrome.storage.local.set({ 
                currentSession, 
                todayStats, 
                totalStats 
            });
            
        } catch (error) {
            console.error('Error counting reel directly:', error);
        }
    }

    /**
     * Cleanup method for when the page is unloaded
     */
    destroy() {
        // No cleanup needed for current implementation
    }
}

// Initialize the Instagram tracker
const instagramTracker = new InstagramTracker();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    instagramTracker.destroy();
});
