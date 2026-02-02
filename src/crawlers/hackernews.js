import { fetchWithRetry } from './http.js';

const HN_API = 'https://hacker-news.firebaseio.com/v0';

async function getStory(id) {
    try {
        const { data } = await fetchWithRetry(`${HN_API}/item/${id}.json`, {}, 1);
        return data;
    } catch {
        return null;
    }
}

export async function fetchHackerNews(limit = 30) {
    try {
        const { data: topIds } = await fetchWithRetry(`${HN_API}/topstories.json`);

        if (!Array.isArray(topIds) || topIds.length === 0) {
            return [];
        }

        const storyIds = topIds.slice(0, limit);

        // Fetch in batches to avoid overwhelming
        const batchSize = 10;
        const stories = [];

        for (let i = 0; i < storyIds.length; i += batchSize) {
            const batch = storyIds.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(getStory));
            stories.push(...batchResults);
        }

        return stories
            .filter(story => story && story.url)
            .map(story => ({
                id: `hn-${story.id}`,
                title: story.title || 'Untitled',
                url: story.url,
                source: 'Hacker News',
                sourceId: 'hackernews',
                score: story.score || 0,
                comments: story.descendants || 0,
                timestamp: new Date((story.time || Date.now() / 1000) * 1000),
                author: story.by || 'unknown',
            }));
    } catch (error) {
        return [];
    }
}
