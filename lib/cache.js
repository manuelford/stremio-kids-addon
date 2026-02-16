const DEFAULT_TTL = 4 * 60 * 60 * 1000; // 4 hours
const MAX_ENTRIES = 10000;

class Cache {
    constructor() {
        this.store = new Map();
    }

    get(key) {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }

    set(key, value, ttl = DEFAULT_TTL) {
        if (this.store.size > MAX_ENTRIES) {
            const keys = this.store.keys();
            for (let i = 0; i < 1000; i++) {
                const { value: k, done } = keys.next();
                if (done) break;
                this.store.delete(k);
            }
        }
        this.store.set(key, { value, expiresAt: Date.now() + ttl });
    }
}

module.exports = new Cache();
