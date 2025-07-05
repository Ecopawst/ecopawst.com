export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { groupId } = req.body;
  try {
    const response = await fetch('http://localhost:3001/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed');
    res.status(200).json(data);
  } catch (e) {
    await fetch('/api/report-bug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'CheckoutAPI', message: e.message, stack: e.stack, context: { groupId } })
    });
    res.status(500).json({ error: 'Server error' });
  }
}
