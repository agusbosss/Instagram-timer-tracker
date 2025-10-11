// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCIKWyDE7-GuLji4LnGv1LtuQGb96dJKJI",
  authDomain: "instagram-timer.firebaseapp.com",
  projectId: "instagram-timer",
  storageBucket: "instagram-timer.firebasestorage.app",
  messagingSenderId: "96739929889",
  appId: "1:96739929889:web:80d1c1e7e207863544d860",
  measurementId: "G-J0TKMR0NBC"
};

// Firebase v9 SDK (modular) - loaded from local files
// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(app);
const db = firebase.firestore(app);

// Export for use in other files
window.firebaseAuth = auth;
window.firebaseDb = db;
window.GoogleAuthProvider = GoogleAuthProvider;
window.signInWithPopup = firebase.auth.signInWithPopup;
window.signOut = firebase.auth.signOut;
window.doc = firebase.firestore.doc;
window.setDoc = firebase.firestore.setDoc;
window.getDoc = firebase.firestore.getDoc;
window.updateDoc = firebase.firestore.updateDoc;
window.increment = firebase.firestore.increment;
