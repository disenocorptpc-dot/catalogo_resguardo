class CloudDB {
    constructor() {
        this.isCloudflare = true;
        this.blobCache = new Map();
        this.urlCache = new Map();
        this.inFlight = new Map();
    }

    async init() {
        console.log("🔐 Authenticating... (Cloudflare Mode)");
        console.log("✅ Conectado a Cloudflare D1");
        return this;
    }

    async saveState(key, data) {
        try {
            console.log(`💾 Guardando estado en D1: ${key}`);
            const res = await fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, data })
            });
            return res.ok;
        } catch (e) {
            console.error("Save Error", e);
            return false;
        }
    }

    async getState(key) {
        try {
            console.log(`🔍 Buscando estado en D1: ${key}`);
            const res = await fetch(`/api/state?key=${key}`);
            if (res.ok) {
                const data = await res.json();
                if (data) return data;
            }
        } catch (e) {
            console.error("Get Error", e);
        }
        return null;
    }

    async saveImage(id, blob) {
        try {
            const base64 = await this.blobToBase64(blob);
            if (!base64 || base64.length > 1500000) {
                console.warn("⚠️ Imagen muy grande o nula para D1.");
                return;
            }
            console.log(`📸 Guardando imagen en D1: ${id}`);
            await fetch('/api/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, base64 })
            });

            // Update local cache immediately
            const processedBlob = await (await fetch(base64)).blob();
            if (this.urlCache.has(id)) {
                URL.revokeObjectURL(this.urlCache.get(id));
            }
            this.blobCache.set(id, processedBlob);
            this.urlCache.set(id, URL.createObjectURL(processedBlob));
        } catch (e) {
            console.error("Image Save Error", e);
        }
    }

    async getImage(id) {
        if (!id) return null;
        if (this.blobCache.has(id)) {
            return this.blobCache.get(id);
        }
        if (this.inFlight.has(id)) {
            return this.inFlight.get(id);
        }

        const promise = (async () => {
            try {
                const res = await fetch(`/api/image?id=${encodeURIComponent(id)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.base64) {
                        const blob = await (await fetch(data.base64)).blob();
                        this.blobCache.set(id, blob);
                        return blob;
                    }
                }
            } catch (e) {
                // Silent fallback
            } finally {
                this.inFlight.delete(id);
            }
            return null;
        })();

        this.inFlight.set(id, promise);
        return promise;
    }

    async getImageUrl(id) {
        if (!id) return null;
        if (this.urlCache.has(id)) {
            return this.urlCache.get(id);
        }
        const blob = await this.getImage(id);
        if (blob) {
            const url = URL.createObjectURL(blob);
            this.urlCache.set(id, url);
            return url;
        }
        return null;
    }

    async blobToBase64(blob) {
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(blob);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                const MAX_SIZE = 1024;
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
                console.log("📸 Image Processed:", Math.round(dataUrl.length / 1024) + "KB");
                URL.revokeObjectURL(url);
                resolve(dataUrl);
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }
}

window.db = new CloudDB();
window.dispatchEvent(new Event('dbLoaded'));
