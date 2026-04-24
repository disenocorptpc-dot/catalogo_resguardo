export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  if (request.method === 'GET') {
    const key = url.searchParams.get('key');
    if (!key) return new Response('Missing key', { status: 400 });
    
    try {
      const stmt = env.DB.prepare('SELECT content FROM chunks WHERE id = ?').bind(`data_${key}`);
      const row = await stmt.first();
      if (row) {
        return new Response(row.content, { headers: { 'Content-Type': 'application/json' } });
      } else {
        return new Response('null', { headers: { 'Content-Type': 'application/json' } });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  if (request.method === 'POST') {
    try {
      const { key, data } = await request.json();
      const targetId = `data_${key}`;
      const contentStr = JSON.stringify(data);
      
      const stmt = env.DB.prepare(`
        INSERT INTO chunks (id, type, content) 
        VALUES (?, 'json_data', ?) 
        ON CONFLICT(id) DO UPDATE SET content=excluded.content, updated_at=CURRENT_TIMESTAMP
      `).bind(targetId, contentStr);
      
      await stmt.run();
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
}
