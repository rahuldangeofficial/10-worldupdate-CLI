import { postWithRetry } from './http.js';

export async function fetchHashnode(limit = 20) {
  try {
    const query = `
      query {
        storiesFeed(type: BEST, first: ${limit}) {
          edges {
            node {
              id
              title
              brief
              url
              publishedAt
              reactionCount
              responseCount
              author {
                username
              }
              tags {
                name
              }
            }
          }
        }
      }
    `;

    const { data } = await postWithRetry(
      'https://gql.hashnode.com/',
      { query },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const stories = data?.data?.storiesFeed?.edges || [];

    return stories.map(({ node }) => ({
      id: `hashnode-${node?.id || Math.random().toString(36)}`,
      title: node?.title || 'Untitled',
      url: node?.url || '',
      source: 'Hashnode',
      sourceId: 'hashnode',
      score: node?.reactionCount || 0,
      comments: node?.responseCount || 0,
      timestamp: new Date(node?.publishedAt || Date.now()),
      author: node?.author?.username || 'unknown',
      summary: (node?.brief || '').slice(0, 200),
      tags: node?.tags?.map(t => t.name) || [],
    }));
  } catch {
    return [];
  }
}
