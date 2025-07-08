export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { pet_id } = req.body;
  try {
    const response = await fetch('http://localhost:3001/api/generate-memorybook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pet_id })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed');
    res.status(200).json(data);
  } catch (err) {
    await fetch('/api/report-bug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'MemoryBookAPI', message: err.message, stack: err.stack, context: { pet_id } })
    });
    res.status(500).json({ error: 'Server error' });
  }
}
