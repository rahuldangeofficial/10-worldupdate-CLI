// Crawler aggregator - imports and runs all crawlers with robust error handling

import { fetchHackerNews } from './hackernews.js';
import { fetchReddit } from './reddit.js';
import { fetchLobsters } from './lobsters.js';
import { fetchDevTo } from './devto.js';
import { fetchGitHubTrending, fetchGitHubBlog } from './github.js';
import { fetchSlashdot } from './slashdot.js';
import { fetchTechmeme } from './techmeme.js';
import { fetchHashnode } from './hashnode.js';
import { fetchDZone } from './dzone.js';
import { fetchTheHackerNews } from './thehackernews.js';
import { fetchKrebs } from './krebs.js';
import { fetchArsTechnica } from './arstechnica.js';
import { fetchPapersWithCode } from './paperswithcode.js';
import { fetchProductHunt } from './producthunt.js';

const crawlers = {
    hackernews: { fn: fetchHackerNews, name: 'Hacker News' },
    lobsters: { fn: fetchLobsters, name: 'Lobsters' },
    slashdot: { fn: fetchSlashdot, name: 'Slashdot' },
    techmeme: { fn: fetchTechmeme, name: 'Techmeme' },
    devto: { fn: fetchDevTo, name: 'DEV.to' },
    hashnode: { fn: fetchHashnode, name: 'Hashnode' },
    dzone: { fn: fetchDZone, name: 'DZone' },
    github_trending: { fn: fetchGitHubTrending, name: 'GitHub Trending' },
    github_blog: { fn: fetchGitHubBlog, name: 'GitHub Blog' },
    thehackernews: { fn: fetchTheHackerNews, name: 'The Hacker News' },
    krebs: { fn: fetchKrebs, name: 'Krebs on Security' },
    arstechnica: { fn: fetchArsTechnica, name: 'Ars Technica' },
    paperswithcode: { fn: fetchPapersWithCode, name: 'Papers With Code' },
    producthunt: { fn: fetchProductHunt, name: 'Product Hunt' },
};

// Reddit is handled separately since it fetches multiple subreddits at once
const REDDIT_SOURCES = [
    'reddit_programming',
    'reddit_technology',
    'reddit_netsec',
    'reddit_machinelearning',
    'reddit_devops',
    'reddit_golang',
    'reddit_rust',
    'reddit_javascript',
];

export async function fetchAllSources(enabledSources, verbose = false, log = console.log) {
    const results = [];
    const errors = [];
    const successCount = { count: 0 };

    // Check if any Reddit source is enabled
    const redditEnabled = enabledSources.some(s => REDDIT_SOURCES.includes(s.id));
    const otherSources = enabledSources.filter(s => !REDDIT_SOURCES.includes(s.id));

    // Build fetch promises
    const fetchPromises = [];

    // Add Reddit if enabled
    if (redditEnabled) {
        fetchPromises.push(
            (async () => {
                try {
                    const items = await fetchReddit(15);
                    if (verbose) log(`    [OK] Reddit (${items.length} items)`);
                    successCount.count++;
                    return { source: 'reddit', items };
                } catch (error) {
                    if (verbose) log(`    [FAIL] Reddit: ${error.message}`);
                    errors.push({ source: 'reddit', error: error.message });
                    return { source: 'reddit', items: [] };
                }
            })()
        );
    }

    // Add other sources
    for (const source of otherSources) {
        const crawler = crawlers[source.id];
        if (!crawler) continue;

        fetchPromises.push(
            (async () => {
                try {
                    const items = await crawler.fn();
                    if (verbose) log(`    [OK] ${crawler.name} (${items.length} items)`);
                    successCount.count++;
                    return { source: source.id, items };
                } catch (error) {
                    if (verbose) log(`    [FAIL] ${crawler.name}: ${error.message}`);
                    errors.push({ source: source.id, error: error.message });
                    return { source: source.id, items: [] };
                }
            })()
        );
    }

    // Execute all in parallel with timeout
    const fetchResults = await Promise.allSettled(fetchPromises);

    for (const result of fetchResults) {
        if (result.status === 'fulfilled' && result.value.items) {
            results.push(...result.value.items);
        }
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
        items: results,
        errors,
        successCount: successCount.count,
        totalSources: fetchPromises.length,
    };
}

export { crawlers, REDDIT_SOURCES };
