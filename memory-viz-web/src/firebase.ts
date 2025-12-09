import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyD8z9KTIKfq-8hoP0NFenkfvF6jHT26CH0",
  authDomain: "oslab-00.firebaseapp.com",
  projectId: "oslab-00",
  storageBucket: "oslab-00.firebasestorage.app",
  messagingSenderId: "516401263286",
  appId: "1:516401263286:web:00007aa8c38cacd58cac17",
  measurementId: "G-0EMP5W1Z4G"
};


const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const functions = getFunctions(app);

export { app, analytics, functions };
