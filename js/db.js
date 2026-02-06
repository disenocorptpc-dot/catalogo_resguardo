
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Config from 'galactic-glenn' project
const firebaseConfig = {
    apiKey: "AIzaSyBq4Y-zfQvksbFe36vb0pjagNu8poHvjyg",
    authDomain: "speed-dashboard-8a1a9.firebaseapp.com",
    projectId: "speed-dashboard-8a1a9",
    storageBucket: "speed-dashboard-8a1a9.firebasestorage.app",
    messagingSenderId: "650632424816",
    appId: "1:650632424816:web:bd37e796996ad3db9273b5",
    measurementId: "G-WDR0Z2EDHC"
};

class CloudDB {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
        this.storage = getStorage(this.app);
        this.docRef = doc(this.db, "sculpture_catalog", "global_state");
        console.log("🔥 Firebase Cloud Connected");
    }

    async init() {
        // No local open needed, connection is stateless
        return this;
    }

    async saveState(key, data) {
        // We sync the entire 'items' array to a single field 'data'
        // 'key' arg is usually 'app_data' from app.js
        try {
            await setDoc(this.docRef, { [key]: data }, { merge: true });
            //    console.log("☁️ Saved to Cloud");
        } catch (e) {
            console.error("Save Error", e);
        }
    }

    async getState(key) {
        // Initial Fetch
        try {
            const snap = await getDoc(this.docRef);
            if (snap.exists()) {
                return snap.data()[key];
            }
        } catch (e) {
            console.error("Get Error", e);
        }
        return null;
    }

    // Optional: Realtime Listener
    // app.js doesn't use it yet, but useful for future
    subscribe(key, callback) {
        return onSnapshot(this.docRef, (doc) => {
            if (doc.exists()) callback(doc.data()[key]);
        });
    }

    async saveImage(id, blob) {
        try {
            const storageRef = ref(this.storage, `images/${id}`);
            await uploadBytes(storageRef, blob);
            //     console.log("☁️ Image Uploaded");
        } catch (e) {
            console.error("Image Upload Error", e);
        }
    }

    async getImage(id) {
        try {
            const storageRef = ref(this.storage, `images/${id}`);
            const url = await getDownloadURL(storageRef);
            // Fetch blob to maintain compatibility with app.js
            const res = await fetch(url);
            return await res.blob();
        } catch (e) {
            // console.warn("Image not found or error", e);
            return null;
        }
    }
}

// Export globally for app.js
window.db = new CloudDB();
