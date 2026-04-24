class CloudDB {
    constructor() {
        this.isCloudflare = true;
    }

    async init() {
        console.log("🔐 Authenticating... (Cloudflare Mode)");
        // D1 doesn't require client-side auth like Firebase, we connect via API endpoints.
        console.log("✅ Conectado a Cloudflare D1");
        return this;
    }

    async saveState(key, data) {
        try {
            console.log(`💾 Guardando estado en D1: ${key}`);
            await fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, data })
            });
        } catch (e) { console.error("Save Error", e); }
    }

    async getState(key) {
        try {
            console.log(`🔍 Buscando estado en D1: ${key}`);
            const res = await fetch(`/api/state?key=${key}`);
            if (res.ok) {
                const data = await res.json();
                if (data) return data;
            }
        } catch (e) { console.error("Get Error", e); }
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
        } catch (e) { console.error("Image Save Error", e); }
    }

    async getImage(id) {
        try {
            const res = await fetch(`/api/image?id=${id}`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.base64) {
                    return await (await fetch(data.base64)).blob();
                }
            }
        } catch (e) { }
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

                // Resize Max Dimension 1024px
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

                // Compress JPEG 70%
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
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

// Emit event for app.js if needed (like odp_maker does, though not required if app.js awaits init)
window.dispatchEvent(new Event('dbLoaded'));
