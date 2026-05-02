import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBgnVvKKugnomlnsIxWK29uQJgB-P4HT5w",
  authDomain: "swami-ji-matka-acf76.firebaseapp.com",
  projectId: "swami-ji-matka-acf76",
  storageBucket: "swami-ji-matka-acf76.firebasestorage.app",
  messagingSenderId: "820351843703",
  appId: "1:820351843703:web:382486efa5a7237e90f572",
  measurementId: "G-W5BD0ED1YP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  console.log("Fetching bets...");
  const q = query(
    collection(db, "games"),
    orderBy("created_at", "desc"),
    limit(5)
  );
  try {
    const snap = await getDocs(q);
    console.log(`Found ${snap.size} games.`);
    snap.forEach(doc => {
      const data = doc.data();
      console.log(`- Game ID: ${doc.id}, Title: '${data.title}', Open: ${data.openTime}`);
    });
  } catch (err) {
    console.error("Error:", err.message);
  }
  process.exit();
}

test();
