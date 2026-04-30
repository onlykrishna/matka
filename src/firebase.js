import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBgnVvKKugnomlnsIxWK29uQJgB-P4HT5w",
  authDomain: "swami-ji-matka-acf76.firebaseapp.com",
  projectId: "swami-ji-matka-acf76",
  storageBucket: "swami-ji-matka-acf76.firebasestorage.app",
  messagingSenderId: "820351843703",
  appId: "1:820351843703:web:382486efa5a7237e90f572",
  measurementId: "G-W5BD0ED1YP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);

export default app;
