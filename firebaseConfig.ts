// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBJLnCcK2X-k915sMsYXNWJ14-j31tlYR4",
  authDomain: "ostoslista3firebase.firebaseapp.com",
  databaseURL: "https://ostoslista3firebase-default-rtdb.firebaseio.com",
  projectId: "ostoslista3firebase",
  storageBucket: "ostoslista3firebase.firebasestorage.app",
  messagingSenderId: "739253998193",
  appId: "1:739253998193:web:8550b98a755148894541d0",
  measurementId: "G-105ZF6KHVZ"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);