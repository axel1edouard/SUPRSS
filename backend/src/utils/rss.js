import Parser from 'rss-parser';
const parser = new Parser();

export async function fetchFeedArticles(feedUrl) {
  const parsed = await parser.parseURL(feedUrl);
  return {
    meta: {
      title: parsed.title || '',
      description: parsed.description || ''
    },
    items: (parsed.items || []).map(i => ({
      title: i.title || '',
      link: i.link || i.guid || '',
      pubDate: i.isoDate ? new Date(i.isoDate) : (i.pubDate ? new Date(i.pubDate) : null),
      author: i.creator || i.author || '',
      summary: i.contentSnippet || i.content || '',
      contentSnippet: i.contentSnippet || ''
    }))
  };
}
