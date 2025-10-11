// Firebase App SDK v9 (simplified version for Chrome Extension)
// This is a minimal implementation to avoid CDN dependencies

class FirebaseApp {
    constructor(config) {
        this.config = config;
        this.name = '[DEFAULT]';
        this.options = config;
    }
}

class FirebaseAuth {
    constructor(app) {
        this.app = app;
        this.currentUser = null;
        this.authStateChangedCallbacks = [];
    }

    onAuthStateChanged(callback) {
        this.authStateChangedCallbacks.push(callback);
        // Call immediately if user is already set
        if (this.currentUser) {
            callback(this.currentUser);
        }
    }

    async signInWithPopup(auth, provider) {
        // This will be implemented with Chrome Identity API
        throw new Error('signInWithPopup not implemented - use Chrome Identity API');
    }

    async signOut() {
        this.currentUser = null;
        this.authStateChangedCallbacks.forEach(callback => callback(null));
    }
}

class GoogleAuthProvider {
    constructor() {
        this.providerId = 'google.com';
    }
}

class Firestore {
    constructor(app) {
        this.app = app;
    }

    doc(db, path, ...pathSegments) {
        return {
            path: path + '/' + pathSegments.join('/'),
            db: db
        };
    }

    async setDoc(docRef, data) {
        // Store in Chrome storage for now
        const key = `firestore_${docRef.path}`;
        await chrome.storage.local.set({ [key]: data });
        console.log('Data stored locally:', docRef.path, data);
    }

    async getDoc(docRef) {
        const key = `firestore_${docRef.path}`;
        const result = await chrome.storage.local.get([key]);
        return {
            exists: () => !!result[key],
            data: () => result[key] || {}
        };
    }

    async updateDoc(docRef, data) {
        const key = `firestore_${docRef.path}`;
        const existing = await chrome.storage.local.get([key]);
        const updated = { ...existing[key], ...data };
        await chrome.storage.local.set({ [key]: updated });
        console.log('Data updated locally:', docRef.path, updated);
    }

    increment(value) {
        return { type: 'increment', value };
    }
}

// Global Firebase object
window.firebase = {
    initializeApp: (config) => new FirebaseApp(config),
    auth: (app) => new FirebaseAuth(app),
    firestore: (app) => new Firestore(app)
};

// Add static methods to firebase.auth
window.firebase.auth.GoogleAuthProvider = GoogleAuthProvider;
window.firebase.auth.signInWithPopup = async (auth, provider) => {
    // Use Chrome Identity API instead
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                // Simulate successful login
                auth.currentUser = {
                    uid: 'user_' + Date.now(),
                    email: 'user@example.com',
                    displayName: 'Test User'
                };
                auth.authStateChangedCallbacks.forEach(callback => callback(auth.currentUser));
                resolve({ user: auth.currentUser });
            }
        });
    });
};
window.firebase.auth.signOut = async (auth) => {
    chrome.identity.clearAllCachedAuthTokens(() => {
        auth.currentUser = null;
        auth.authStateChangedCallbacks.forEach(callback => callback(null));
    });
};

// Add static methods to firebase.firestore
window.firebase.firestore.doc = (db, path, ...pathSegments) => ({
    path: path + '/' + pathSegments.join('/'),
    db: db
});
window.firebase.firestore.setDoc = async (docRef, data) => {
    const key = `firestore_${docRef.path}`;
    await chrome.storage.local.set({ [key]: data });
    console.log('Data stored locally:', docRef.path, data);
};
window.firebase.firestore.getDoc = async (docRef) => {
    const key = `firestore_${docRef.path}`;
    const result = await chrome.storage.local.get([key]);
    return {
        exists: () => !!result[key],
        data: () => result[key] || {}
    };
};
window.firebase.firestore.updateDoc = async (docRef, data) => {
    const key = `firestore_${docRef.path}`;
    const existing = await chrome.storage.local.get([key]);
    const updated = { ...existing[key], ...data };
    await chrome.storage.local.set({ [key]: updated });
    console.log('Data updated locally:', docRef.path, updated);
};
window.firebase.firestore.increment = (value) => ({ type: 'increment', value });
