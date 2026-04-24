export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  if (request.method === 'GET') {
    const id = url.searchParams.get('id');
    if (!id) return new Response('Missing id', { status: 400 });
    
    try {
      const stmt = env.catalogo_resguardo.prepare('SELECT content FROM chunks WHERE id = ?').bind(`img_${id}`);
      const row = await stmt.first();
      if (row) {
        return new Response(JSON.stringify({ base64: row.content }), { headers: { 'Content-Type': 'application/json' } });
      } else {
        return new Response('Not found', { status: 404 });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  if (request.method === 'POST') {
    try {
      const { id, base64 } = await request.json();
      const targetId = `img_${id}`;
      
      const stmt = env.catalogo_resguardo.prepare(`
        INSERT INTO chunks (id, type, content) 
        VALUES (?, 'image', ?) 
        ON CONFLICT(id) DO UPDATE SET content=excluded.content, updated_at=CURRENT_TIMESTAMP
      `).bind(targetId, base64);
      
      await stmt.run();
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
}
