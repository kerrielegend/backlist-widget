const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const PREFIX = 'enc:v1:';
function decrypt(value) {
  if (!value || !value.startsWith(PREFIX)) return { ok: true, plain: true };
  const secret = process.env.TOKEN_ENC_KEY;
  if (!secret) return { ok: false, reason: 'TOKEN_ENC_KEY not set' };
  try {
    const key = crypto.createHash('sha256').update(secret, 'utf8').digest();
    const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const token = req.query.token || '(none)';
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return res.status(200).json({ error: 'Supabase not configured' });

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: widget } = await db
    .from('widgets')
    .select('token, notion_token, database_id')
    .eq('token', token)
    .maybeSingle();

  return res.status(200).json({
    token_enc_key_set: !!process.env.TOKEN_ENC_KEY,
    match_found: !!widget,
    has_notion_token: !!widget?.notion_token,
    has_database_id: !!widget?.database_id,
    decrypt_result: widget?.notion_token ? decrypt(widget.notion_token) : 'n/a',
  });
};
