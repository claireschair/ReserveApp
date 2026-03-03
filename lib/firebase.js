import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAtkttz7jDDjXYbtYBlXltaxfhPxWcC--c",
  authDomain: "reserve-11b9d.firebaseapp.com",
  projectId: "reserve-11b9d",
  storageBucket: "reserve-11b9d.firebasestorage.app",
  messagingSenderId: "263442422913",
  appId: "1:263442422913:web:b017c2e6192632c7ed4180",
  measurementId: "G-RM3NRMK4W6"
};
//test 

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);