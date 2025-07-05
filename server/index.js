import express from 'express';
import { Configuration, OpenAIApi } from 'openai';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { reportBug } from './maintainer.js';

const rateMap = new Map();
function sanitize(input) {
  return typeof input === 'string' ? input.replace(/<[^>]+/g, '') : input;
}

const app = express();
app.use(express.json());

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Endpoint to generate caption for a post
app.post('/api/caption', async (req, res) => {
  const ip = req.ip;
  const now = Date.now();
  const times = rateMap.get(ip) || [];
  rateMap.set(ip, times.filter(t => now - t < 60000).concat(now));
  if (rateMap.get(ip).length > 5) return res.status(429).json({ error: 'Too many requests' });
  const { postId, prompt } = req.body;
  if (!postId) return res.status(400).json({ error: 'postId required' });

  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: sanitize(prompt) || 'Write a cute caption for my pet video.' }]
    });
    const caption = completion.data.choices[0].message.content.trim();

    const { error } = await supabase.from('posts').update({ caption }).eq('id', postId);
    if (error) throw error;
    res.json({ caption });
  } catch (err) {
    await reportBug({
      type: 'CaptionGeneration',
      message: err.message,
      stack: err.stack,
      context: { route: '/api/caption', postId }
    });
    console.error(err);
    res.status(500).json({ error: 'Caption generation failed' });
  }
});

// create stripe checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  const { groupId, amount, donorName } = req.body;
  if (!groupId || !amount) return res.status(400).json({ error: 'missing data' });
  try {
    const { data: group, error } = await supabase.from('donation_groups').select('name').eq('id', groupId).single();
    if (error) throw error;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price_data: { currency: 'usd', unit_amount: Math.round(amount * 100), product_data: { name: group.name } }, quantity: 1 }],
      success_url: `${req.headers.origin}/donate/${groupId}?success=1`,
      cancel_url: `${req.headers.origin}/donate/${groupId}?canceled=1`,
      payment_intent_data: { metadata: { donorName: sanitize(donorName || '') } }
    });
    res.json({ url: session.url });
  } catch (err) {
    await reportBug({
      type: 'StripeBackend',
      message: err.message,
      stack: err.stack,
      context: { groupId }
    });
    console.error(err);
    res.status(500).json({ error: 'Stripe error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
