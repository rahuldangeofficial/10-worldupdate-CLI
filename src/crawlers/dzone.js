import Parser from 'rss-parser';

const parser = new Parser({
    timeout: 15000,
    maxRedirects: 3,
});

async function safeParseFeed(url) {
    try {
        return await parser.parseURL(url);
    } catch {
        return { items: [] };
    }
}

export async function fetchDZone(limit = 20) {
    try {
        const feed = await safeParseFeed('https://feeds.dzone.com/home');

        return (feed.items || []).slice(0, limit).map((item, i) => ({
            id: `dzone-${i}-${Date.now()}`,
            title: item.title || 'Untitled',
            url: item.link || '',
            source: 'DZone',
            sourceId: 'dzone',
            score: 0,
            comments: 0,
            timestamp: item.pubDate ? new Date(item.pubDate) : new Date(),
            summary: (item.contentSnippet || '').slice(0, 200),
            author: item.creator || 'unknown',
        }));
    } catch {
        return [];
    }
}
