/**
 * Simple IndexedDB Wrapper for persistency
 * Allows storing Images (Blobs) and Data without file system access
 */
const DB_NAME = 'SculptureTrackerDB';
const DB_VERSION = 1;

class LocalDB {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (e) => reject('Database error: ' + e.target.errorCode);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                // Store for Application State (JSON)
                if (!db.objectStoreNames.contains('state')) {
                    db.createObjectStore('state', { keyPath: 'key' });
                }
                // Store for Images (Blob)
                if (!db.objectStoreNames.contains('images')) {
                    db.createObjectStore('images', { keyPath: 'id' });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this);
            };
        });
    }

    async saveState(key, data) {
        return this.put('state', { key, data });
    }

    async getState(key) {
        const result = await this.get('state', key);
        return result ? result.data : null;
    }

    async saveImage(id, blob) {
        // We store blob directly
        return this.put('images', { id, blob });
    }

    async getImage(id) {
        const result = await this.get('images', id);
        return result ? result.blob : null;
    }

    // Generic helpers
    put(storeName, item) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([storeName], 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(item);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    get(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([storeName], 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
}

const db = new LocalDB();
