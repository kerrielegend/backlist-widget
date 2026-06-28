const { createClient } = require('@supabase/supabase-js');
const { Client } = require('@notionhq/client');
const crypto = require('crypto');

const PREFIX = 'enc:v1:';
function decrypt(value) {
  if (!value || !value.startsWith(PREFIX)) return value;
  const key = crypto.createHash('sha256').update(process.env.TOKEN_ENC_KEY, 'utf8').digest();
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const token = req.query.token;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: widget } = await db
    .from('widgets')
    .select('notion_token, database_id')
    .eq('token', token)
    .maybeSingle();

  if (!widget) return res.status(200).json({ error: 'Widget not found' });

  let notionToken, databaseId;
  try {
    notionToken = decrypt(widget.notion_token);
    databaseId = widget.database_id;
  } catch (e) {
    return res.status(200).json({ error: 'Decrypt failed', reason: e.message });
  }

  const notion = new Client({ auth: notionToken });
  try {
    const result = await notion.databases.query({
      database_id: databaseId,
      page_size: 1,
    });
    return res.status(200).json({
      notion_ok: true,
      total_results: result.results.length,
      database_id: databaseId,
      token_prefix: notionToken.slice(0, 8) + '...',
    });
  } catch (e) {
    return res.status(200).json({
      notion_ok: false,
      notion_error: e.message,
      notion_code: e.code,
      database_id: databaseId,
      token_prefix: notionToken.slice(0, 8) + '...',
    });
  }
};
