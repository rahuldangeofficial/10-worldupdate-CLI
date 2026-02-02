import OpenAI from 'openai';
import { config } from '../config.js';

let openai = null;

function getClient() {
    if (!openai && config.openai.apiKey) {
        openai = new OpenAI({ apiKey: config.openai.apiKey });
    }
    return openai;
}

const SYSTEM_PROMPT = `You are a tech news analyst. Filter news for genuine impact and provide CONTEXT so readers understand why items matter.

PRIORITIZE THESE CATEGORIES:

1. CRITICAL - Security & Breaking:
   - Security vulnerabilities (CVEs, breaches, zero-days)
   - Breaking incidents affecting many users
   - Critical outages or data leaks

2. IMPORTANT - Industry & Tech:
   - New tools/frameworks with real adoption potential
   - Breakthrough research (AI, systems, crypto)
   - Major open source releases
   - Industry-shifting announcements
   - Acquisitions, pivots, deprecations

3. OPPORTUNITY - Deals & Benefits:
   - Free tiers or trials being offered
   - Significant discounts on developer tools
   - Companies giving away resources
   - Open-sourcing of previously paid tools
   - Free credits, extended trials
   - Educational resources made free

4. NOTABLE - Worth Knowing:
   - Interesting trends
   - Useful tutorials or resources
   - Community discussions worth following

EXCLUDE:
- Clickbait and sensationalized headlines
- Opinion pieces without substance
- Routine updates (minor versions, bug fixes)
- Rehashed content from multiple sources
- Generic listicles and career advice

FOR EACH SELECTED ITEM, provide:
1. Impact level: CRITICAL, IMPORTANT, OPPORTUNITY, or NOTABLE
2. A contextual insight (2-3 sentences):
   - If the topic is not widely known, FIRST explain what it is
   - Then explain why this news matters
   - For OPPORTUNITY items, clearly state the benefit and any time limits

Return JSON format only.`;

const DIGEST_SYSTEM_PROMPT = `You are a tech news analyst creating a WEEKLY DIGEST for someone who checks news once a week. Your job is to ensure they don't miss anything important.

Your analysis must:
1. Identify the MAJOR THEMES from this week's news
2. Highlight MUST-KNOW items that everyone is talking about
3. Surface any OPPORTUNITIES (deals, free offers, limited-time benefits)
4. Provide a brief "WHAT YOU NEED TO KNOW" executive summary

CATEGORY DEFINITIONS:
- THEME: A recurring topic that appeared multiple times (e.g., "AI Agents", "Security breaches in npm packages")
- MUST_KNOW: Individual items that are essential to know, even if you read nothing else
- OPPORTUNITY: Deals, free tiers, discounts, newly open-sourced tools
- NOTABLE: Worth knowing but not critical

For themes, group related news together and explain the overall narrative.
For individual items, provide context especially for lesser-known topics.

OUTPUT FORMAT:
{
  "weekSummary": "2-3 sentence overview of what defined this week in tech",
  "themes": [
    {
      "name": "Theme name",
      "description": "What happened and why it matters",
      "relatedItems": [array of item indices that belong to this theme]
    }
  ],
  "mustKnow": [
    {
      "index": <item index>,
      "impact": "MUST_KNOW",
      "insight": "Why this is essential to know"
    }
  ],
  "opportunities": [
    {
      "index": <item index>,
      "impact": "OPPORTUNITY",
      "insight": "What's the benefit and any time limits"
    }
  ],
  "notable": [
    {
      "index": <item index>,
      "impact": "NOTABLE",
      "insight": "Brief context"
    }
  ]
}`;

export async function analyzeNews(items, limit = 15) {
    const client = getClient();

    if (!client) {
        return items.slice(0, limit).map(item => ({
            ...item,
            impact: 'NOTABLE',
            insight: null,
        }));
    }

    const itemsForAnalysis = items.slice(0, 120).map((item, index) => ({
        index,
        title: item.title,
        source: item.source,
        score: item.score,
        comments: item.comments,
        summary: item.summary?.slice(0, 150),
    }));

    try {
        const response = await client.chat.completions.create({
            model: config.openai.model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `Analyze these ${itemsForAnalysis.length} news items. Select the top ${limit} most impactful ones.

Return JSON:
{
  "selected": [
    {
      "index": <original index>,
      "impact": "CRITICAL" | "IMPORTANT" | "OPPORTUNITY" | "NOTABLE",
      "insight": "<contextual explanation, 2-3 sentences>"
    }
  ]
}

News items:
${JSON.stringify(itemsForAnalysis, null, 2)}`,
                },
            ],
            temperature: 0.2,
            max_tokens: 4000,
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('Empty response');

        const analysis = JSON.parse(content);
        if (!analysis.selected || !Array.isArray(analysis.selected)) {
            throw new Error('Invalid response');
        }

        return analysis.selected
            .filter(s => s.index >= 0 && s.index < items.length)
            .map(selected => ({
                ...items[selected.index],
                impact: selected.impact || 'NOTABLE',
                insight: selected.insight || null,
            }));
    } catch {
        return items.slice(0, limit).map(item => ({
            ...item,
            impact: 'NOTABLE',
            insight: null,
        }));
    }
}

export async function analyzeDigest(items, limit = 20) {
    const client = getClient();

    if (!client) {
        return {
            weekSummary: 'AI analysis unavailable. Set OPENAI_API_KEY.',
            themes: [],
            items: items.slice(0, limit).map(item => ({ ...item, impact: 'NOTABLE', insight: null })),
        };
    }

    // For digest, we analyze more items to find patterns
    const itemsForAnalysis = items.slice(0, 150).map((item, index) => ({
        index,
        title: item.title,
        source: item.source,
        score: item.score,
        comments: item.comments,
        summary: item.summary?.slice(0, 100),
    }));

    try {
        const response = await client.chat.completions.create({
            model: config.openai.model,
            messages: [
                { role: 'system', content: DIGEST_SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `Create a weekly digest from these ${itemsForAnalysis.length} news items.
Identify major themes, must-know items, opportunities, and notable items.
Limit to ${limit} total items across all categories.

News items:
${JSON.stringify(itemsForAnalysis, null, 2)}`,
                },
            ],
            temperature: 0.3,
            max_tokens: 5000,
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('Empty response');

        const analysis = JSON.parse(content);

        // Collect all individual items
        const allItems = [];
        const seenIndices = new Set();

        for (const item of (analysis.mustKnow || [])) {
            if (!seenIndices.has(item.index) && item.index < items.length) {
                seenIndices.add(item.index);
                allItems.push({ ...items[item.index], impact: 'MUST_KNOW', insight: item.insight });
            }
        }

        for (const item of (analysis.opportunities || [])) {
            if (!seenIndices.has(item.index) && item.index < items.length) {
                seenIndices.add(item.index);
                allItems.push({ ...items[item.index], impact: 'OPPORTUNITY', insight: item.insight });
            }
        }

        for (const item of (analysis.notable || [])) {
            if (!seenIndices.has(item.index) && item.index < items.length) {
                seenIndices.add(item.index);
                allItems.push({ ...items[item.index], impact: 'NOTABLE', insight: item.insight });
            }
        }

        return {
            weekSummary: analysis.weekSummary || '',
            themes: analysis.themes || [],
            items: allItems.slice(0, limit),
        };
    } catch {
        return {
            weekSummary: 'Analysis failed. Showing raw items.',
            themes: [],
            items: items.slice(0, limit).map(item => ({ ...item, impact: 'NOTABLE', insight: null })),
        };
    }
}

export async function deduplicateNews(items) {
    const seen = new Map();
    const unique = [];

    for (const item of items) {
        const normalizedUrl = (item.url || '')
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/$/, '')
            .toLowerCase();

        const normalizedTitle = (item.title || '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 50);

        if (normalizedUrl && !seen.has(normalizedUrl) && !seen.has(normalizedTitle)) {
            seen.set(normalizedUrl, true);
            if (normalizedTitle) seen.set(normalizedTitle, true);
            unique.push(item);
        }
    }

    return unique;
}
