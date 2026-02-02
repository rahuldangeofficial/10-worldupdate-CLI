import { fetchWithRetry } from './http.js';

export async function fetchDevTo(limit = 25) {
    try {
        const { data } = await fetchWithRetry(
            `https://dev.to/api/articles?per_page=${limit}&top=1`
        );

        if (!Array.isArray(data)) {
            return [];
        }

        return data.map(article => ({
            id: `devto-${article.id || Math.random().toString(36)}`,
            title: article.title || 'Untitled',
            url: article.url || '',
            source: 'DEV.to',
            sourceId: 'devto',
            score: article.positive_reactions_count || 0,
            comments: article.comments_count || 0,
            timestamp: new Date(article.published_at || Date.now()),
            author: article.user?.username || 'unknown',
            summary: article.description || '',
            tags: article.tag_list || [],
        }));
    } catch {
        return [];
    }
}
