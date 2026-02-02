import { fetchWithRetry } from './http.js';

export async function fetchPapersWithCode(limit = 15) {
    try {
        const { data } = await fetchWithRetry('https://paperswithcode.com/api/v1/papers/', {
            params: {
                ordering: '-published',
                items_per_page: limit,
            },
        });

        const papers = data?.results || [];

        return papers.map(paper => ({
            id: `pwc-${paper.id || Math.random().toString(36)}`,
            title: paper.title || 'Untitled',
            url: paper.url_abs || `https://paperswithcode.com/paper/${paper.id}`,
            source: 'Papers With Code',
            sourceId: 'paperswithcode',
            score: 0,
            comments: 0,
            timestamp: paper.published ? new Date(paper.published) : new Date(),
            summary: (paper.abstract || '').slice(0, 200),
            category: 'ai',
            authors: paper.authors?.slice(0, 3).join(', ') || '',
        }));
    } catch {
        return [];
    }
}
