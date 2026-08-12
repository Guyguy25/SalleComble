import { createSessionCookie } from './_auth.js';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { username, password } = await req.json();

    const validUser = process.env.ADMIN_USERNAME;
    const validPass = process.env.ADMIN_PASSWORD;
    const secret = process.env.ADMIN_SESSION_SECRET;

    if (!validUser || !validPass || !secret) {
      console.error('login: missing ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_SESSION_SECRET');
      return new Response(JSON.stringify({ error: 'Authentification non configurée côté serveur' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ok = username === validUser && password === validPass;
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Identifiants incorrects' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': createSessionCookie(username),
      },
    });
  } catch (err) {
    console.error('login error:', err);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};