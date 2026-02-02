import { fetchWithRetry } from './http.js';
import * as cheerio from 'cheerio';

export async function fetchGitHubTrending(limit = 25) {
    try {
        const { data: html } = await fetchWithRetry('https://github.com/trending');

        if (!html || typeof html !== 'string') {
            return [];
        }

        const $ = cheerio.load(html);
        const repos = [];

        $('article.Box-row').each((i, el) => {
            if (i >= limit) return;

            try {
                const $el = $(el);
                const repoPath = ($el.find('h2 a').attr('href') || '').trim();
                const description = $el.find('p').text().trim();
                const language = $el.find('[itemprop="programmingLanguage"]').text().trim();
                const starsText = $el.find('a[href$="/stargazers"]').text().trim();
                const stars = parseInt(starsText.replace(/,/g, '')) || 0;
                const todayStarsMatch = $el.find('.float-sm-right').text().match(/(\d+)/);
                const todayStars = todayStarsMatch ? parseInt(todayStarsMatch[1]) : 0;

                if (repoPath) {
                    repos.push({
                        id: `github-${repoPath.replace(/\//g, '-')}`,
                        title: `${repoPath.slice(1)} - ${description || 'No description'}`.slice(0, 200),
                        url: `https://github.com${repoPath}`,
                        source: 'GitHub Trending',
                        sourceId: 'github_trending',
                        score: stars,
                        comments: 0,
                        timestamp: new Date(),
                        language: language || 'Unknown',
                        todayStars,
                    });
                }
            } catch {
                // Skip malformed entries
            }
        });

        return repos;
    } catch {
        return [];
    }
}

export async function fetchGitHubBlog(limit = 10) {
    try {
        const { data: html } = await fetchWithRetry('https://github.blog/');

        if (!html || typeof html !== 'string') {
            return [];
        }

        const $ = cheerio.load(html);
        const posts = [];

        $('article').each((i, el) => {
            if (i >= limit) return;

            try {
                const $el = $(el);
                const $link = $el.find('h2 a, h3 a').first();
                const title = $link.text().trim();
                const href = $link.attr('href') || '';
                const date = $el.find('time').attr('datetime');

                if (title && href) {
                    posts.push({
                        id: `ghblog-${i}-${Date.now()}`,
                        title,
                        url: href.startsWith('http') ? href : `https://github.blog${href}`,
                        source: 'GitHub Blog',
                        sourceId: 'github_blog',
                        score: 0,
                        comments: 0,
                        timestamp: date ? new Date(date) : new Date(),
                    });
                }
            } catch {
                // Skip malformed entries
            }
        });

        return posts;
    } catch {
        return [];
    }
}
