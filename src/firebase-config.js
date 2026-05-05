// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBKA4O32xyhy2TKJW4MHR_-Du30hBUSb2E",
  authDomain: "kucse26portal.firebaseapp.com",
  projectId: "kucse26portal",
  storageBucket: "kucse26portal.firebasestorage.app",
  messagingSenderId: "818913593776",
  appId: "1:818913593776:web:be2ebb16daa98a9ce96e75",
  measurementId: "G-M6WQKK7WXL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
// Ensure these names match what App.js is looking for
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider(); // App.js needs 'googleProvider'
export const db = getFirestore(app); // Change 'firestore' to 'db' here
export const storage = getStorage(app);