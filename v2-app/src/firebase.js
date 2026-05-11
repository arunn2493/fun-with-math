// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCklgQc5sELRfg5sJskH9LJXPvzz_ujN6A",
  authDomain: "fun-with-math-bd66c.firebaseapp.com",
  projectId: "fun-with-math-bd66c",
  storageBucket: "fun-with-math-bd66c.firebasestorage.app",
  messagingSenderId: "868678419573",
  appId: "1:868678419573:web:2068073bbca0241818643c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

export const db = getFirestore(app);