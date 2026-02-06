
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

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
        this.auth = getAuth(this.app);
        this.docRef = null;
        console.log("🔥 Firebase Cloud Connected (Auth Required)");
    }

    async init() {
        try {
            console.log("🔐 Authenticating...");
            await signInAnonymously(this.auth);
            console.log("✅ Auth Success!");

            // Now proceed with normal init logic
            await this.connectToDoc();
        } catch (e) {
            console.error("❌ Auth Failed! Please Enable Anonymous Auth in Firebase Console.", e);
            alert("⚠️ ERROR: Firebase Auth is disabled.\nPlease enable 'Anonymous' in Firebase Console > Authentication > Sign-in method.");
        }
        return this;
    }

    async connectToDoc() {
        // Use query based approach (galactic-glenn style) + Auth
        try {
            const q = query(collection(this.db, "projects"), orderBy("order", "asc"));
            const snap = await getDocs(q);

            let foundDoc = null;
            snap.forEach(d => {
                if (d.data().client === 'SYSTEM INTERNAL') foundDoc = d;
            });

            if (foundDoc) {
                this.docRef = doc(this.db, "projects", foundDoc.id);
                console.log("✅ Cloud Data Linked");
            } else {
                console.log("✨ Creating Cloud Data...");
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
            console.error("Firestore Init Error", e);
        }
    }

    async saveState(key, data) {
        if (!this.docRef) return;
        try {
            await setDoc(this.docRef, {
                [key]: data,
                name: "⚠️ SCULPTURE DATA (SYSTEM)",
                client: "SYSTEM INTERNAL",
                order: 9999
            }, { merge: true });
        } catch (e) { console.error("Save Error", e); }
    }

    async getState(key) {
        if (!this.docRef) await this.init();
        if (!this.docRef) return null;

        try {
            const snap = await getDoc(this.docRef);
            return snap.exists() ? snap.data()[key] : null;
        } catch (e) { console.error("Get Error", e); return null; }
    }

    async saveImage(id, blob) {
        if (!this.docRef) return;
        try {
            const base64 = await this.blobToBase64(blob);
            if (base64.length > 950000) return;
            const imgDoc = doc(this.db, "projects", this.docRef.id, "chunks", "img_" + id);
            await setDoc(imgDoc, { content: base64, type: "image" });
        } catch (e) { console.error("Image Save Error", e); }
    }

    async getImage(id) {
        if (!this.docRef) await this.init();
        if (!this.docRef) return null;
        try {
            const imgDoc = doc(this.db, "projects", this.docRef.id, "chunks", "img_" + id);
            const snap = await getDoc(imgDoc);
            if (snap.exists()) return await (await fetch(snap.data().content)).blob();
        } catch (e) { }
        return null;
    }

    blobToBase64(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }
}

window.db = new CloudDB();
