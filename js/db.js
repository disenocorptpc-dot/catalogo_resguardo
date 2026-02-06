
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection } from "firebase/firestore";
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
        console.log("🔥 CloudDB: Init");
    }

    async init() {
        try {
            console.log("🔐 Authenticating...");
            await signInAnonymously(this.auth);
            console.log("✅ Auth Success! User:", this.auth.currentUser.uid);
            await this.connectToDoc();
        } catch (e) {
            console.error("Auth Fail", e);
            alert("Error de Autenticación en Firebase.");
        }
        return this;
    }

    async connectToDoc() {
        // Strategy: Use LocalStorage to remember ID, bypassing 'List' permission issues
        const LOCAL_ID_KEY = 'sculpture_cloud_id_v1';
        const savedId = localStorage.getItem(LOCAL_ID_KEY);

        if (savedId) {
            console.log("📍 Found saved Cloud ID:", savedId);
            const ref = doc(this.db, "projects", savedId);
            try {
                // Try reading directly (often allowed when listing is blocked)
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    this.docRef = ref;
                    console.log("✅ Re-connected to Cloud Data");
                    return;
                } else {
                    console.warn("Saved doc not found (deleted?). Creating new.");
                }
            } catch (e) {
                console.warn("Direct Read failed (Permission?), trying creation path...", e);
            }
        }

        // Create New Document
        try {
            console.log("✨ Creating new Cloud Doc...");
            // Add owner field in case rules check for it
            const ref = await addDoc(collection(this.db, "projects"), {
                name: "⚠️ SCULPTURE DATA",
                client: "SYSTEM",
                deadline: "2099-12-31",
                progress: 0,
                order: 9999,
                owner: this.auth.currentUser.uid, // Security Rule Hint
                uid: this.auth.currentUser.uid,   // Security Rule Hint
                createdAt: new Date(),
                app_data: []
            });

            this.docRef = ref;
            localStorage.setItem(LOCAL_ID_KEY, ref.id);
            console.log("✅ Created & Saved ID:", ref.id);
        } catch (e) {
            console.error("❌ Creation Failed. Rules are extremely strict.", e);
            alert("Error Crítico: Firebase rechaza guardar datos (Permisos).");
        }
    }

    async saveState(key, data) {
        if (!this.docRef) return;
        try {
            await setDoc(this.docRef, { [key]: data }, { merge: true });
        } catch (e) { console.error("Save Error", e); }
    }

    async getState(key) {
        if (!this.docRef) await this.init();
        if (!this.docRef) return null;
        try {
            const snap = await getDoc(this.docRef);
            return snap.exists() ? snap.data()[key] : null;
        } catch (e) { return null; }
    }

    async saveImage(id, blob) {
        if (!this.docRef) return;
        try {
            const base64 = await this.blobToBase64(blob);
            if (base64.length > 950000) return;
            const imgDoc = doc(this.db, "projects", this.docRef.id, "chunks", "img_" + id);
            await setDoc(imgDoc, { content: base64, type: "image", owner: this.auth.currentUser.uid });
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
