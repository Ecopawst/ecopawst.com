export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { memorialId, message } = req.body;
  if (!memorialId || !message) return res.status(400).json({ error: 'missing data' });

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/pawflowers`, {
      method: 'POST',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ memorial_id: memorialId, message, created_at: new Date().toISOString() })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Insert failed');
    res.status(200).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save pawflower' });
  }
}
