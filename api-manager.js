// API Configuration and Rate Limiting
class APIManager {
    constructor() {
        this.rateLimits = {
            github: {
                remaining: 60, // GitHub API rate limit for unauthenticated requests
                resetTime: null,
                maxRetries: 3
            },
            mdn: {
                remaining: 100,
                resetTime: null,
                maxRetries: 2
            }
        };
        
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async makeRequest(url, options = {}) {
        // Check cache first
        const cacheKey = this.getCacheKey(url, options);
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }

        // Add rate limiting headers
        const headers = {
            'User-Agent': 'WebAPI-Research-Tool/1.0',
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Handle rate limiting
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`);
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Cache the response
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.warn(`API request failed for ${url}:`, error.message);
            throw error;
        }
    }

    getCacheKey(url, options) {
        return `${url}-${JSON.stringify(options.headers || {})}`;
    }

    clearCache() {
        this.cache.clear();
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIManager;
} else {
    window.APIManager = APIManager;
}
