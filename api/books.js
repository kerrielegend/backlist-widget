const { Client } = require('@notionhq/client');

const NOTION_TOKEN       = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const WIDGET_TOKEN       = process.env.WIDGET_TOKEN;

// Notion property name → widget_key
const LINK_FIELDS = {
  'Link: Amazon':            'amazon',
  'Link: Barnes & Noble':    'bn',
  'Link: Apple Books':       'apple',
  'Link: Kobo':              'kobo',
  'Link: Google Play Books': 'googleplay',
  'Link: Audible':           'audible',
  'Link: BookFunnel':        'bookfunnel',
  'Link: Bookshop.org':      'bookshop',
  'Link: Payhip':            'payhip',
  'Link: Gumroad':           'gumroad',
  'Link: Libro.fm':          'librofm',
  'Link: Books-A-Million':   'bam',
  'Link: Smashwords':        'smashwords',
  'Link: Draft2Digital':     'd2d',
  'Link: Scribd / Everand':  'scribd',
  'Link: Spotify Audiobooks':'spotify',
  'Link: Chirp':             'chirp',
  'Link: Booktopia':         'booktopia',
  'Link: Waterstones':       'waterstones',
  "Link: Blackwell's":       'blackwells',
  'Link: Author Store':      'authorstore',
  'Link: Libby / OverDrive': 'libby',
  'Link: Hoopla':            'hoopla',
  'Link: Downpour':          'downpour',
  'Link: Storytel':          'storytel',
  'Link: Walmart':           'walmart',
  'Link: Target':            'target',
  'Link: ThriftBooks':       'thriftbooks',
};

function text(prop) {
  if (!prop) return '';
  const arr = prop.rich_text || prop.title || [];
  return arr.map(b => b.plain_text).join('');
}

function coverUrl(prop) {
  if (!prop || !prop.files || !prop.files.length) return null;
  const f = prop.files[0];
  return f.type === 'external' ? f.external.url : f.file?.url ?? null;
}

function transformPage(page) {
  const p = page.properties;

  const links = {};
  for (const [notionKey, widgetKey] of Object.entries(LINK_FIELDS)) {
    links[widgetKey] = p[notionKey]?.url ?? null;
  }

  return {
    id:           page.id,
    title:        text(p['Title']),
    cover:        coverUrl(p['Cover Image']),
    author:       text(p['Author']),
    blurb:        text(p['Blurb']),
    series:       p['Series Name']?.select?.name ?? null,
    seriesNumber: p['Series Number']?.number ?? null,
    genre:        (p['Genre']?.multi_select ?? []).map(g => g.name),
    subgenre:     (p['Sub-genre']?.multi_select ?? []).map(g => g.name),
    format:       (p['Format']?.multi_select ?? []).map(f => f.name),
    pubDate:      p['Publication Date']?.date?.start ?? null,
    status:       p['Status']?.select?.name ?? null,
    featured:     p['Featured']?.checkbox ?? false,
    newRelease:   p['New Release']?.checkbox ?? false,
    visible:      p['Widget Visible']?.checkbox ?? true,
    order:        p['Widget Order']?.number ?? null,
    links,
  };
}

function sortBooks(books) {
  const series     = books.filter(b => b.series);
  const standalones = books.filter(b => !b.series);

  series.sort((a, b) => {
    const nameSort = (a.series ?? '').localeCompare(b.series ?? '');
    if (nameSort !== 0) return nameSort;
    if (a.order !== null && b.order !== null) return a.order - b.order;
    if (a.seriesNumber !== null && b.seriesNumber !== null) return a.seriesNumber - b.seriesNumber;
    if (a.seriesNumber !== null) return -1;
    if (b.seriesNumber !== null) return 1;
    return (b.pubDate ?? '').localeCompare(a.pubDate ?? '');
  });

  standalones.sort((a, b) => {
    if (a.order !== null && b.order !== null) return a.order - b.order;
    const dateSort = (b.pubDate ?? '').localeCompare(a.pubDate ?? '');
    if (dateSort !== 0) return dateSort;
    return a.title.localeCompare(b.title);
  });

  return [...series, ...standalones];
}

async function fetchAllBooks(notion) {
  const books = [];
  let cursor;

  do {
    const res = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      filter: {
        and: [
          { property: 'Status',         select:   { equals: 'Published' } },
          { property: 'Widget Visible', checkbox: { equals: true } },
        ],
      },
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of res.results) {
      books.push(transformPage(page));
    }

    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return books;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Token auth
  if (WIDGET_TOKEN && req.query.token !== WIDGET_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    res.status(500).json({ error: 'API not configured' });
    return;
  }

  try {
    const notion = new Client({ auth: NOTION_TOKEN });
    const raw    = await fetchAllBooks(notion);
    const books  = sortBooks(raw);

    res.status(200).json({ books });
  } catch (err) {
    console.error('Notion fetch error:', err);
    res.status(502).json({ error: 'Failed to fetch from Notion' });
  }
};
