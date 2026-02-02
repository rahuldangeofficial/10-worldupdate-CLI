import { fetchWithRetry } from './http.js';

export async function fetchProductHunt(limit = 15) {
    try {
        const { data: html } = await fetchWithRetry('https://www.producthunt.com/', {
            headers: { 'Accept': 'text/html' },
        });

        if (!html || typeof html !== 'string') {
            return [];
        }

        // Extract JSON data from the HTML
        const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
        if (!jsonMatch || !jsonMatch[1]) {
            return [];
        }

        let data;
        try {
            data = JSON.parse(jsonMatch[1]);
        } catch {
            return [];
        }

        const posts = data?.props?.apolloState || {};

        const products = Object.values(posts)
            .filter(item => item?.__typename === 'Post' && item?.name && item?.tagline)
            .slice(0, limit)
            .map(product => ({
                id: `ph-${product.id || Math.random().toString(36)}`,
                title: `${product.name}: ${product.tagline}`,
                url: product.url || `https://www.producthunt.com/posts/${product.slug}`,
                source: 'Product Hunt',
                sourceId: 'producthunt',
                score: product.votesCount || 0,
                comments: product.commentsCount || 0,
                timestamp: product.createdAt ? new Date(product.createdAt) : new Date(),
                category: 'product',
            }));

        return products;
    } catch {
        return [];
    }
}
