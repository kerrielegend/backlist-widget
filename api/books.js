const { Client } = require('@notionhq/client');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// AES-256-GCM decrypt — must match TOKEN_ENC_KEY used in backlist-site
const PREFIX = 'enc:v1:';
function getEncKey() {
  const secret = process.env.TOKEN_ENC_KEY;
  if (!secret) throw new Error('TOKEN_ENC_KEY is not configured');
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
}
function decrypt(value) {
  if (!value || !value.startsWith(PREFIX)) return value;
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

async function lookupCustomer(widgetToken) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await db
    .from('licenses')
    .select('notion_token, database_id')
    .eq('widget_token', widgetToken)
    .eq('status', 'active')
    .maybeSingle();
  return data;
}

// Notion property name → widget_key
const LINK_FIELDS = {
  'Amazon':            'amazon',
  'Barnes & Noble':    'bn',
  'Apple Books':       'apple',
  'Kobo':              'kobo',
  'Google Play Books': 'googleplay',
  'Audible':           'audible',
  'BookFunnel':        'bookfunnel',
  'Bookshop.org':      'bookshop',
  'Payhip':            'payhip',
  'Gumroad':           'gumroad',
  'Libro.fm':          'librofm',
  'Books-A-Million':   'bam',
  'Smashwords':        'smashwords',
  'Draft2Digital':     'd2d',
  'Scribd / Everand':  'scribd',
  'Spotify Audiobooks':'spotify',
  'Chirp':             'chirp',
  'Booktopia':         'booktopia',
  'Waterstones':       'waterstones',
  "Blackwell's":       'blackwells',
  'Author Store':      'authorstore',
  'Libby / OverDrive': 'libby',
  'Hoopla':            'hoopla',
  'Downpour':          'downpour',
  'Storytel':          'storytel',
  'Walmart':           'walmart',
  'Target':            'target',
  'ThriftBooks':       'thriftbooks',
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
    title:        text(p['Name']) || text(p['Title']),
    cover:        coverUrl(p['Cover Image']),
    author:       text(p['Author']),
    blurb:        text(p['Blurb']),
    series:       text(p['Series']) || p['Series Name']?.select?.name || null,
    seriesNumber: p['Series Number']?.number ?? null,
    pubDate:      p['Publication Date']?.date?.start ?? null,
    status:       p['Status']?.select?.name ?? null,
    visible:      p['Widget Visible']?.checkbox ?? true,
    links,
  };
}

function sortBooks(books) {
  const series      = books.filter(b => b.series);
  const standalones = books.filter(b => !b.series);

  series.sort((a, b) => {
    const nameSort = (a.series ?? '').localeCompare(b.series ?? '');
    if (nameSort !== 0) return nameSort;
    if (a.seriesNumber !== null && b.seriesNumber !== null) return a.seriesNumber - b.seriesNumber;
    if (a.seriesNumber !== null) return -1;
    if (b.seriesNumber !== null) return 1;
    return (b.pubDate ?? '').localeCompare(a.pubDate ?? '');
  });

  standalones.sort((a, b) => {
    const dateSort = (b.pubDate ?? '').localeCompare(a.pubDate ?? '');
    if (dateSort !== 0) return dateSort;
    return a.title.localeCompare(b.title);
  });

  return [...series, ...standalones];
}

async function fetchAllBooks(notion, databaseId) {
  const books = [];
  let cursor;

  do {
    const res = await notion.databases.query({
      database_id: databaseId,
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const widgetToken = req.query.token;
  if (!widgetToken) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  let notionToken, databaseId;
  try {
    const customer = await lookupCustomer(widgetToken);
    if (!customer) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    notionToken = decrypt(customer.notion_token);
    databaseId  = customer.database_id;
  } catch (err) {
    console.error('Supabase lookup error:', err);
    res.status(500).json({ error: 'Authentication failed' });
    return;
  }

  if (!notionToken || !databaseId) {
    res.status(500).json({ error: 'Widget not fully configured — complete setup at backlist.kerrielegend.com/setup' });
    return;
  }

  try {
    const notion = new Client({ auth: notionToken });
    const raw    = await fetchAllBooks(notion, databaseId);
    const books  = sortBooks(raw);
    res.status(200).json({ books });
  } catch (err) {
    console.error('Notion fetch error:', err);
    res.status(502).json({ error: 'Failed to fetch from Notion' });
  }
};
