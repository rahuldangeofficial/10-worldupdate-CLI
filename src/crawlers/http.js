import axios from 'axios';

// Shared axios instance with timeout and retry logic
const httpClient = axios.create({
    timeout: 15000,
    headers: {
        'User-Agent': 'worldupdate-cli/1.0.0 (https://github.com/worldupdate)',
        'Accept': 'application/json, text/html',
    },
});

// Retry wrapper for GET
async function fetchWithRetry(url, options = {}, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await httpClient.get(url, options);
        } catch (error) {
            if (attempt === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }
}

// Retry wrapper for POST
async function postWithRetry(url, data, options = {}, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await httpClient.post(url, data, options);
        } catch (error) {
            if (attempt === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }
}

export { httpClient, fetchWithRetry, postWithRetry };
