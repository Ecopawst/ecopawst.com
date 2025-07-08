export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { postId } = req.body;
  try {
    const response = await fetch('http://localhost:3001/api/caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed');
    res.status(200).json(data);
  } catch (e) {
    await fetch('/api/report-bug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'CaptionAPI', message: e.message, stack: e.stack, context: { postId } })
    });
    res.status(500).json({ error: 'Server error' });
  }
}
