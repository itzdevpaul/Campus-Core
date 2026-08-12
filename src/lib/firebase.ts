import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDvSFDc8V_u9pqICK-FH_S8tZTPi-p16gU",
  authDomain: "campus-core-7ca30.firebaseapp.com",
  databaseURL: "https://campus-core-7ca30-default-rtdb.firebaseio.com",
  projectId: "campus-core-7ca30",
  storageBucket: "campus-core-7ca30.appspot.com",
  messagingSenderId: "197537030755",
  appId: "1:197537030755:web:3a1437008b0da42842ce56",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
