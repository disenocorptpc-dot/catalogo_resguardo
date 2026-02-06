
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBq4Y-zfQvksbFe36vb0pjagNu8poHvjyg",
    authDomain: "speed-dashboard-8a1a9.firebaseapp.com",
    projectId: "speed-dashboard-8a1a9",
    storageBucket: "speed-dashboard-8a1a9.firebasestorage.app",
    messagingSenderId: "650632424816",
    appId: "1:650632424816:web:bd37e796996ad3db9273b5",
    measurementId: "G-WDR0Z2EDHC"
};

const DB_NAME = 'SculptureTrackerDB';
const DB_VERSION = 1;

class HybridDB {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
        this.docRef = null;
        this.mode = 'cloud'; // Default
        this.localDB = null;
        console.log("🔄 Initializing Hybrid DB...");
    }

    async init() {
        try {
            console.log("☁️ Attempting Cloud Connection...");
            // Try Simple Query (No OrderBy) to test waters
            const q = query(collection(this.db, "projects"));
            const snap = await getDocs(q);

            let foundDoc = null;
            snap.forEach(d => {
                if (d.data().client === 'SYSTEM INTERNAL') foundDoc = d;
            });

            if (foundDoc) {
                this.docRef = doc(this.db, "projects", foundDoc.id);
                console.log("✅ Cloud Connected: Linked to existing Data");
            } else {
                console.log("✨ Cloud Connected: Creating new Data...");
                const ref = await addDoc(collection(this.db, "projects"), {
                    name: "⚠️ SCULPTURE DATA (SYSTEM)",
                    client: "SYSTEM INTERNAL",
                    deadline: "2099-12-31",
                    progress: 0,
                    order: 9999,
                    responsible: ["SYSTEM"],
                    phaseStarts: [],
                    phaseEnds: [],
                    logs: [],
                    app_data: []
                });
                this.docRef = ref;
            }
        } catch (e) {
            console.warn("⚠️ Cloud Blocked (Permissions). Switching to offline storage.", e);
            this.mode = 'local';
            await this.initLocal();
        }
        return this;
    }

    // --- LOCAL FALLBACK (IndexedDB) ---
    async initLocal() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = (e) => reject('DB Error');
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('state')) db.createObjectStore('state', { keyPath: 'key' });
                if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'id' });
            };
            request.onsuccess = (e) => {
                this.localDB = e.target.result;
                console.log("💾 Offline Mode Activated (Data saved locally)");
                resolve();
            };
        });
    }

    // --- INTERFACE ---
    async saveState(key, data) {
        if (this.mode === 'cloud' && this.docRef) {
            try {
                await setDoc(this.docRef, {
                    [key]: data,
                    name: "⚠️ SCULPTURE DATA (SYSTEM)",
                    client: "SYSTEM INTERNAL",
                    order: 9999
                }, { merge: true });
            } catch (e) { console.error("Cloud Save Failed", e); }
        } else {
            // Local Save
            if (!this.localDB) await this.initLocal();
            this.putLocal('state', { key, data });
        }
    }

    async getState(key) {
        if (this.mode === 'cloud' && this.docRef) {
            try {
                const snap = await getDoc(this.docRef);
                return snap.exists() ? snap.data()[key] : null;
            } catch (e) { console.error("Cloud Get Failed", e); return null; }
        } else {
            // Local Get
            if (!this.localDB) await this.initLocal();
            const res = await this.getLocal('state', key);
            return res ? res.data : null;
        }
    }

    async saveImage(id, blob) {
        if (this.mode === 'cloud' && this.docRef) {
            try {
                const base64 = await this.blobToBase64(blob);
                if (base64.length > 950000) return; // Skip huge images
                const imgDoc = doc(this.db, "projects", this.docRef.id, "chunks", "img_" + id);
                await setDoc(imgDoc, { content: base64, type: "image" });
            } catch (e) { console.error("Cloud Image Save Failed", e); }
        } else {
            // Local Image
            if (!this.localDB) await this.initLocal();
            this.putLocal('images', { id, blob });
        }
    }

    async getImage(id) {
        if (this.mode === 'cloud' && this.docRef) {
            try {
                const imgDoc = doc(this.db, "projects", this.docRef.id, "chunks", "img_" + id);
                const snap = await getDoc(imgDoc);
                if (snap.exists()) {
                    return await (await fetch(snap.data().content)).blob();
                }
            } catch (e) { }
        } else {
            // Local Image
            if (!this.localDB) await this.initLocal();
            const res = await this.getLocal('images', id);
            return res ? res.blob : null;
        }
        return null;
    }

    // --- HELPERS ---
    blobToBase64(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }

    putLocal(storeName, item) {
        return new Promise((resolve) => {
            const tx = this.localDB.transaction([storeName], 'readwrite');
            tx.objectStore(storeName).put(item).onsuccess = () => resolve();
        });
    }

    getLocal(storeName, key) {
        return new Promise((resolve) => {
            const tx = this.localDB.transaction([storeName], 'readonly');
            tx.objectStore(storeName).get(key).onsuccess = (e) => resolve(e.target.result);
        });
    }
}

window.db = new HybridDB();
