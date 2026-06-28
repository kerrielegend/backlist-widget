const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const token = req.query.token || '(none)';

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '(not set)';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || url === '(not set)' || !key) {
    return res.status(200).json({ error: 'Supabase not configured', url, hasKey: !!key });
  }

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: rows, error } = await db
    .from('widgets')
    .select('id, token, database_id, created_at')
    .limit(10);

  const { data: match } = await db
    .from('widgets')
    .select('id, token, database_id')
    .eq('token', token)
    .maybeSingle();

  return res.status(200).json({
    queried_token: token,
    supabase_url: url.slice(0, 40) + '...',
    all_widget_tokens: (rows || []).map(r => r.token),
    match_found: !!match,
    supabase_error: error?.message || null,
  });
};
