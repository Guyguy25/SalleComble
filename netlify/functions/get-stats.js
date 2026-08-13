import { neon } from '@neondatabase/serverless';
import { verifySession } from './_auth.js';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export default async (req) => {
  const session = verifySession(req);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const days = Math.min(180, Math.max(1, parseInt(url.searchParams.get('days'), 10) || 30));

    const [
      totals,
      timeseries,
      utmSources,
      devices,
      scrollDepth,
      exitIntent,
      topEvents,
    ] = await Promise.all([
      sql`
        SELECT
          COUNT(*)::int AS total_visits,
          COUNT(*) FILTER (WHERE first_name IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL)::int AS engaged,
          COUNT(*) FILTER (WHERE status IN ('completed','booked'))::int AS completed,
          COUNT(*) FILTER (WHERE status = 'booked')::int AS booked
        FROM leads
      `,
      sql`
        SELECT
          date_trunc('day', created_at) AS day,
          COUNT(*)::int AS visits,
          COUNT(*) FILTER (WHERE first_name IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL)::int AS engaged,
          COUNT(*) FILTER (WHERE status IN ('completed','booked'))::int AS completed,
          COUNT(*) FILTER (WHERE status = 'booked')::int AS booked
        FROM leads
        WHERE created_at >= now() - make_interval(days => ${days})
        GROUP BY 1
        ORDER BY 1
      `,
      sql`
        SELECT
          COALESCE(utm_source, 'direct') AS utm_source,
          COUNT(*)::int AS visits,
          COUNT(*) FILTER (WHERE status IN ('completed','booked'))::int AS completed
        FROM leads
        GROUP BY 1
        ORDER BY visits DESC
        LIMIT 10
      `,
      sql`
        SELECT
          COALESCE(device_type, 'unknown') AS device_type,
          COUNT(*)::int AS visits,
          COUNT(*) FILTER (WHERE status IN ('completed','booked'))::int AS completed
        FROM leads
        GROUP BY 1
        ORDER BY visits DESC
      `,
      sql`
        SELECT
          (event_data->>'depth')::int AS depth,
          COUNT(DISTINCT session_id)::int AS sessions
        FROM lead_events
        WHERE event_type = 'scroll_depth'
        GROUP BY 1
        ORDER BY 1
      `,
      sql`
        SELECT event_type, COUNT(DISTINCT session_id)::int AS sessions
        FROM lead_events
        WHERE event_type IN ('exit_intent_shown', 'exit_intent_captured')
        GROUP BY 1
      `,
      sql`
        SELECT event_type, COUNT(*)::int AS count
        FROM lead_events
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 15
      `,
    ]);

    return new Response(
      JSON.stringify({
        days,
        totals: totals[0],
        timeseries,
        utm_sources: utmSources,
        devices,
        scroll_depth: scrollDepth,
        exit_intent: exitIntent,
        top_events: topEvents,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('get-stats error:', err);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};