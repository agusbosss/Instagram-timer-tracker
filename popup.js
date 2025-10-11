/**
 * Instagram Time Tracker - Popup Manager
 * Handles user interface, authentication, and statistics display
 */
class PopupManager {
    constructor() {
        this.auth = null;
        this.db = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            // Wait for Firebase to load
            await this.waitForFirebase();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Check if user is already logged in
            await this.checkAuthState();
            
        } catch (error) {
            console.error('Error initializing popup:', error);
            this.showError('Error al inicializar la extensión');
        }
    }

    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebaseAuth && window.firebaseDb) {
                    this.auth = window.firebaseAuth;
                    this.db = window.firebaseDb;
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    setupEventListeners() {
        document.getElementById('login-btn').addEventListener('click', () => {
            this.loginWithGoogle();
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });



        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetStats();
        });

        // No need for Firebase auth state listener - we use Chrome Identity API

        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'sync_data') {
                this.syncDataToFirebase(message.data);
            }
        });
    }

    async checkAuthState() {
        // Check if user is stored in local storage
        const result = await chrome.storage.local.get(['currentUser']);
        const user = result.currentUser;
        this.handleAuthStateChange(user);
    }

    async handleAuthStateChange(user) {
        this.currentUser = user;
        
        if (user) {
            this.showStatsSection();
            await this.loadUserStats();
            await this.loadCurrentSession();
            
            // Store current user in local storage for background script
            await chrome.storage.local.set({ currentUser: user.uid });
        } else {
            this.showLoginSection();
            
            // Clear current user from local storage
            await chrome.storage.local.remove(['currentUser']);
        }
    }

    async loginWithGoogle() {
        try {
            this.showLoading(true);
            
            // Use Chrome Identity API instead of Firebase Auth
            chrome.identity.getAuthToken({ interactive: true }, async (token) => {
                if (chrome.runtime.lastError) {
                    console.error('Login error:', chrome.runtime.lastError);
                    this.showError('Error al hacer login con Google');
                    this.showLoading(false);
                    return;
                }

                try {
                    // Get user info from Google API
                    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`);
                    const userInfo = await response.json();
                    
                    // Create user object
                    const user = {
                        uid: userInfo.id,
                        email: userInfo.email,
                        displayName: userInfo.name,
                        photoURL: userInfo.picture
                    };

                    // Store user in local storage
                    await chrome.storage.local.set({ currentUser: user });
                    
                    // Update UI
                    this.currentUser = user;
                    this.handleAuthStateChange(user);
                    
                    
                } catch (error) {
                    console.error('Error getting user info:', error);
                    this.showError('Error al obtener información del usuario');
                } finally {
                    this.showLoading(false);
                }
            });
            
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Error al hacer login con Google');
            this.showLoading(false);
        }
    }

    async logout() {
        try {
            // Clear Chrome Identity token
            chrome.identity.clearAllCachedAuthTokens(() => {
            });
            
            // Clear local storage
            await chrome.storage.local.remove(['currentUser']);
            
            // Update UI
            this.currentUser = null;
            this.handleAuthStateChange(null);
            
        } catch (error) {
            console.error('Logout error:', error);
            this.showError('Error al hacer logout');
        }
    }

    showLoginSection() {
        document.getElementById('login-section').classList.remove('hidden');
        document.getElementById('stats-section').classList.add('hidden');
    }

    showStatsSection() {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('stats-section').classList.remove('hidden');
        
        if (this.currentUser) {
            document.getElementById('user-email').textContent = this.currentUser.email;
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper error UI
        alert(message);
    }

    async loadUserStats() {
        if (!this.currentUser) return;

        try {
            // Sync total stats with today's stats first
            await this.syncTotalWithToday();
            
            // Load from local storage
            const localResult = await chrome.storage.local.get(['totalStats', 'todayStats']);
            const localTotalStats = localResult.totalStats || { time: 0, reels: 0 };
            
            
            // Update display with local data
            this.updateStatsDisplay(localTotalStats);
            
            // Then try to load from Firebase
            const userDoc = await window.getDoc(window.doc(this.db, 'users', this.currentUser.uid));
            
            if (userDoc.exists()) {
                const data = userDoc.data();
                // Use Firebase data if it's higher than local data
                if (data.totalTime > localTotalStats.time || data.totalReels > localTotalStats.reels) {
                    this.updateStatsDisplay(data);
                }
            } else {
                // Initialize user document if it doesn't exist
                await this.initializeUserDocument();
            }
        } catch (error) {
            console.error('Error loading user stats:', error);
            // Fallback to local storage only
            const localResult = await chrome.storage.local.get(['totalStats', 'todayStats']);
            const localTotalStats = localResult.totalStats || { time: 0, reels: 0 };
            this.updateStatsDisplay(localTotalStats);
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
            console.error('❌ Error syncing total with today in popup:', error);
        }
    }

    async initializeUserDocument() {
        if (!this.currentUser) return;

        try {
            const userData = {
                totalTime: 0,
                totalReels: 0,
                createdAt: new Date(),
                lastUpdated: new Date()
            };

            await window.setDoc(window.doc(this.db, 'users', this.currentUser.uid), userData);
            this.updateStatsDisplay(userData);
            
            // Store current user in local storage for background script
            await chrome.storage.local.set({ currentUser: this.currentUser.uid });
        } catch (error) {
            console.error('Error initializing user document:', error);
        }
    }

    async syncDataToFirebase(data) {
        if (!this.currentUser) return;

        try {
            const { currentUser, totalStats, todayStats } = data;
            
            // Update user's total stats
            await window.updateDoc(window.doc(this.db, 'users', currentUser), {
                totalTime: window.increment(totalStats.time),
                totalReels: window.increment(totalStats.reels),
                lastUpdated: new Date()
            });

            // Save today's session
            if (todayStats && todayStats.time > 0) {
                const sessionId = `session_${Date.now()}`;
                await window.setDoc(window.doc(this.db, 'users', currentUser, 'sessions', sessionId), {
                    date: todayStats.date,
                    duration: todayStats.time,
                    reelsCount: todayStats.reels,
                    timestamp: new Date()
                });
            }

        } catch (error) {
            console.error('Error syncing data to Firebase:', error);
        }
    }

    updateStatsDisplay(data) {
        
        // Update total time
        const totalTimeElement = document.getElementById('total-time');
        const totalTime = data.totalTime || 0;
        totalTimeElement.textContent = this.formatTime(totalTime);

        // Update total reels
        const totalReelsElement = document.getElementById('total-reels');
        const totalReels = data.totalReels || 0;
        totalReelsElement.textContent = totalReels;

        // Calculate today's stats
        this.updateTodayStats(data);
    }

    async updateTodayStats() {
        const today = new Date().toDateString();
        
        try {
            // Get today's session data from local storage
            const result = await chrome.storage.local.get(['todayStats', 'totalStats']);
            const todayStats = result.todayStats || { date: '', time: 0, reels: 0 };
            const totalStats = result.totalStats || { time: 0, reels: 0 };
            
            // Force sync total stats with today's stats
            const syncedTotalStats = {
                time: todayStats.time,
                reels: todayStats.reels
            };
            
            // Save synced total stats
            await chrome.storage.local.set({ totalStats: syncedTotalStats });
            
            if (todayStats.date === today) {
                document.getElementById('today-time').textContent = this.formatTime(todayStats.time);
                document.getElementById('today-reels').textContent = todayStats.reels;
                
                // Update total displays with synced values
                document.getElementById('total-time').textContent = this.formatTime(syncedTotalStats.time);
                document.getElementById('total-reels').textContent = syncedTotalStats.reels;
                
            } else {
                document.getElementById('today-time').textContent = '0s';
                document.getElementById('today-reels').textContent = '0';
                document.getElementById('total-time').textContent = '0s';
                document.getElementById('total-reels').textContent = '0';
            }
        } catch (error) {
            console.error('❌ Error updating today stats:', error);
        }
    }

    async loadCurrentSession() {
        // Get current session data from background script
        chrome.storage.local.get(['currentSession'], (result) => {
            const session = result.currentSession || { time: 0 };
            document.getElementById('current-session-time').textContent = this.formatTime(session.time);
        });
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    }



    async resetStats() {
        const confirmReset = confirm('¿Estás seguro de que quieres resetear todas las estadísticas? Esta acción no se puede deshacer.');
        
        if (confirmReset) {
            try {
                // Reset all stats
                await chrome.storage.local.set({
                    totalStats: { time: 0, reels: 0 },
                    todayStats: { date: '', time: 0, reels: 0 },
                    currentSession: { time: 0, reels: 0, isActive: false }
                });
                
                // Update the display
                this.updateStatsDisplay({ totalTime: 0, totalReels: 0 });
                this.updateTodayStats();
                this.loadCurrentSession();
                
                alert('✅ Estadísticas reseteadas correctamente');
            } catch (error) {
                alert('❌ Error al resetear estadísticas: ' + error.message);
            }
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});

// Update stats every 2 seconds
setInterval(() => {
    if (window.popupManager && window.popupManager.currentUser) {
        window.popupManager.loadCurrentSession();
        window.popupManager.updateTodayStats();
        window.popupManager.loadUserStats(); // Also update total stats
    }
}, 2000);
