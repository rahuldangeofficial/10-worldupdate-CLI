import { fetchWithRetry } from './http.js';
import * as cheerio from 'cheerio';

export async function fetchTechmeme(limit = 20) {
    try {
        const { data: html } = await fetchWithRetry('https://techmeme.com/');

        if (!html || typeof html !== 'string') {
            return [];
        }

        const $ = cheerio.load(html);
        const items = [];

        $('.clus').each((i, el) => {
            if (i >= limit) return;

            try {
                const $el = $(el);
                const $link = $el.find('.ourh');
                const title = $link.text().trim();
                const url = $link.attr('href') || '';
                const source = $el.find('.srcwrap cite').text().trim();

                if (title && url) {
                    items.push({
                        id: `techmeme-${i}-${Date.now()}`,
                        title,
                        url,
                        source: 'Techmeme',
                        sourceId: 'techmeme',
                        score: 0,
                        comments: 0,
                        timestamp: new Date(),
                        originalSource: source || 'Unknown',
                    });
                }
            } catch {
                // Skip malformed entries
            }
        });

        return items;
    } catch {
        return [];
    }
}
