import { fetchWithRetry } from './http.js';

const SUBREDDITS = [
    'programming',
    'technology',
    'netsec',
    'MachineLearning',
    'devops',
    'golang',
    'rust',
    'javascript',
];

async function fetchSubreddit(subreddit, limit = 10) {
    try {
        const { data } = await fetchWithRetry(
            `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`,
            { headers: { 'User-Agent': 'worldupdate-cli/1.0.0' } }
        );

        if (!data?.data?.children) {
            return [];
        }

        return data.data.children
            .filter(post => post?.data && !post.data.stickied)
            .map(post => {
                const p = post.data;
                let url = p.url || '';
                if (url.startsWith('/r/')) {
                    url = `https://reddit.com${url}`;
                }

                return {
                    id: `reddit-${p.id || Math.random().toString(36)}`,
                    title: p.title || 'Untitled',
                    url,
                    source: `r/${subreddit}`,
                    sourceId: `reddit_${subreddit.toLowerCase()}`,
                    score: p.score || 0,
                    comments: p.num_comments || 0,
                    timestamp: new Date((p.created_utc || Date.now() / 1000) * 1000),
                    author: p.author || 'unknown',
                    selftext: (p.selftext || '').slice(0, 200),
                };
            });
    } catch {
        return [];
    }
}

export async function fetchReddit(limit = 10) {
    const results = await Promise.allSettled(
        SUBREDDITS.map(sub => fetchSubreddit(sub, Math.ceil(limit / SUBREDDITS.length) + 2))
    );

    return results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value);
}
