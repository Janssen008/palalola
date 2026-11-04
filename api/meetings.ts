import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ujomzsondbynwrletnvx.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!SERVICE_KEY) {
    return res.status(200).json({ success: true, data: [] });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
  const type = req.query.type || (req.body && req.body.type) || 'agenda';
  const settingKey =
    type === 'minutes'
      ? 'osca_meeting_minutes_list'
      : 'osca_meeting_agendas_list';

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('app_settings')
        .select('*')
        .eq('key', settingKey)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const list = data?.value ? JSON.parse(data.value) : [];
      return res.status(200).json({ success: true, data: list });
    }

    if (req.method === 'POST') {
      const record = req.body.record || req.body;
      if (!record || !record.id) {
        return res
          .status(400)
          .json({ success: false, error: 'Record with id is required' });
      }

      // Fetch current list
      const { data } = await supabaseAdmin
        .from('app_settings')
        .select('*')
        .eq('key', settingKey)
        .single();

      let list = data?.value ? JSON.parse(data.value) : [];
      const existingIdx = list.findIndex((item: any) => item.id === record.id);
      if (existingIdx >= 0) {
        list[existingIdx] = record;
      } else {
        list.unshift(record);
      }

      // Upsert into app_settings
      const { error: upsertErr } = await supabaseAdmin
        .from('app_settings')
        .upsert(
          {
            key: settingKey,
            value: JSON.stringify(list),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );

      if (upsertErr) throw upsertErr;
      return res.status(200).json({ success: true, data: list });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id || (req.body && req.body.id);
      if (!id) {
        return res.status(400).json({ success: false, error: 'id is required' });
      }

      const { data } = await supabaseAdmin
        .from('app_settings')
        .select('*')
        .eq('key', settingKey)
        .single();

      let list = data?.value ? JSON.parse(data.value) : [];
      list = list.filter((item: any) => item.id !== id);

      await supabaseAdmin.from('app_settings').upsert(
        {
          key: settingKey,
          value: JSON.stringify(list),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

      return res.status(200).json({ success: true, data: list });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('Meetings API error:', err);
    return res
      .status(500)
      .json({ success: false, error: err.message || 'Server error' });
  }
}
