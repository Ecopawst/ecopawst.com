export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { type, message, stack, context } = req.body;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/bug_reports`, {
      method: 'POST',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type, message, stack, context, created_at: new Date().toISOString()
      })
    });

    const data = await response.json();
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to report bug' });
  }
}
