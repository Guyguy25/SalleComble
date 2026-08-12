import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const {
      session_id,
      first_name,
      email,
      phone,
      event_type,
      guest_count_target,
      status,
      utm_source,
      utm_medium,
      utm_campaign,
      referrer,
      device_type,
      calendly_scheduled,
    } = body;

    if (!session_id) {
      return new Response(JSON.stringify({ error: 'session_id requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await sql`
      INSERT INTO leads (
        session_id, first_name, email, phone, event_type,
        guest_count_target, status, utm_source, utm_medium,
        utm_campaign, referrer, device_type, calendly_scheduled
      ) VALUES (
        ${session_id}, ${first_name || null}, ${email || null}, ${phone || null}, ${event_type || null},
        ${guest_count_target || null}, ${status || 'partial'}, ${utm_source || null}, ${utm_medium || null},
        ${utm_campaign || null}, ${referrer || null}, ${device_type || null}, ${calendly_scheduled || false}
      )
      ON CONFLICT (session_id) DO UPDATE SET
        first_name = COALESCE(EXCLUDED.first_name, leads.first_name),
        email = COALESCE(EXCLUDED.email, leads.email),
        phone = COALESCE(EXCLUDED.phone, leads.phone),
        event_type = COALESCE(EXCLUDED.event_type, leads.event_type),
        guest_count_target = COALESCE(EXCLUDED.guest_count_target, leads.guest_count_target),
        status = EXCLUDED.status,
        utm_source = COALESCE(leads.utm_source, EXCLUDED.utm_source),
        utm_medium = COALESCE(leads.utm_medium, EXCLUDED.utm_medium),
        utm_campaign = COALESCE(leads.utm_campaign, EXCLUDED.utm_campaign),
        referrer = COALESCE(leads.referrer, EXCLUDED.referrer),
        device_type = COALESCE(leads.device_type, EXCLUDED.device_type),
        calendly_scheduled = EXCLUDED.calendly_scheduled OR leads.calendly_scheduled
    `;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('save-lead error:', err);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};