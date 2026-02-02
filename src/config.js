import { config as dotenvConfig } from 'dotenv';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Load .env from multiple locations
const envPaths = [
    join(process.cwd(), '.env'),
    join(homedir(), '.worldupdate.env'),
    join(homedir(), '.config', 'worldupdate', '.env'),
];

for (const envPath of envPaths) {
    if (existsSync(envPath)) {
        dotenvConfig({ path: envPath });
        break;
    }
}

// Also try default dotenv
dotenvConfig();

export const config = {
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o',
    },

    sources: {
        hackernews: { name: 'Hacker News', category: 'dev', enabled: true },
        lobsters: { name: 'Lobsters', category: 'dev', enabled: true },
        slashdot: { name: 'Slashdot', category: 'dev', enabled: true },
        techmeme: { name: 'Techmeme', category: 'dev', enabled: true },
        reddit_programming: { name: 'r/programming', category: 'dev', enabled: true },
        reddit_technology: { name: 'r/technology', category: 'dev', enabled: true },
        reddit_netsec: { name: 'r/netsec', category: 'security', enabled: true },
        reddit_machinelearning: { name: 'r/MachineLearning', category: 'ai', enabled: true },
        reddit_devops: { name: 'r/devops', category: 'dev', enabled: true },
        reddit_golang: { name: 'r/golang', category: 'dev', enabled: true },
        reddit_rust: { name: 'r/rust', category: 'dev', enabled: true },
        reddit_javascript: { name: 'r/javascript', category: 'dev', enabled: true },
        devto: { name: 'DEV.to', category: 'dev', enabled: true },
        hashnode: { name: 'Hashnode', category: 'dev', enabled: true },
        dzone: { name: 'DZone', category: 'dev', enabled: true },
        github_trending: { name: 'GitHub Trending', category: 'dev', enabled: true },
        github_blog: { name: 'GitHub Blog', category: 'dev', enabled: true },
        thehackernews: { name: 'The Hacker News', category: 'security', enabled: true },
        krebs: { name: 'Krebs on Security', category: 'security', enabled: true },
        arstechnica: { name: 'Ars Technica Security', category: 'security', enabled: true },
        paperswithcode: { name: 'Papers With Code', category: 'ai', enabled: true },
        producthunt: { name: 'Product Hunt', category: 'dev', enabled: true },
    },

    defaults: {
        limit: 15,
        category: 'all',
    },
};

export function getEnabledSources(filterSources, category) {
    let sources = Object.entries(config.sources);

    if (filterSources) {
        const sourceList = filterSources.split(',').map(s => s.trim().toLowerCase());
        sources = sources.filter(([key]) => sourceList.includes(key));
    }

    if (category && category !== 'all') {
        sources = sources.filter(([, value]) => value.category === category);
    }

    sources = sources.filter(([, value]) => value.enabled);

    return sources.map(([key, value]) => ({ id: key, ...value }));
}

export function listSources() {
    const categories = {};

    for (const [key, value] of Object.entries(config.sources)) {
        if (!categories[value.category]) {
            categories[value.category] = [];
        }
        categories[value.category].push({ id: key, name: value.name });
    }

    return categories;
}
