const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const { token, book_id, book_title, retailer } = req.body || {};
  if (!token || !book_id || !retailer) {
    res.status(400).json({ error: 'Missing fields' });
    return;
  }

  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    await db.from('click_events').insert({ widget_token: token, book_id, book_title: book_title || null, retailer });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Click tracking error:', err);
    res.status(500).json({ error: 'Failed to record click' });
  }
};
