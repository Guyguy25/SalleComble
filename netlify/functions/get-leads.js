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
    const leads = await sql`SELECT * FROM leads ORDER BY created_at DESC LIMIT 500`;
    return new Response(JSON.stringify({ leads }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('get-leads error:', err);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};