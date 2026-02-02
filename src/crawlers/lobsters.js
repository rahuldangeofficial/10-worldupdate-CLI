import { fetchWithRetry } from './http.js';

export async function fetchLobsters(limit = 25) {
    try {
        const { data } = await fetchWithRetry('https://lobste.rs/hottest.json');

        if (!Array.isArray(data)) {
            return [];
        }

        return data.slice(0, limit).map(story => ({
            id: `lobsters-${story.short_id || Math.random().toString(36)}`,
            title: story.title || 'Untitled',
            url: story.url || story.comments_url || '',
            source: 'Lobsters',
            sourceId: 'lobsters',
            score: story.score || 0,
            comments: story.comment_count || 0,
            timestamp: new Date(story.created_at || Date.now()),
            author: story.submitter_user?.username || 'unknown',
            tags: story.tags || [],
        }));
    } catch {
        return [];
    }
}
