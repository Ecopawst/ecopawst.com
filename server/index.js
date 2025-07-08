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

// Stripe webhook needs raw body before json middleware
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const amount = session.amount_total / 100;
    const groupId = session.metadata.groupId;
    const donorEmail = session.customer_email || session.metadata.donorEmail;
    const donorName = session.metadata.donorName;
    try {
      const { data, error } = await supabase
        .from('donation_groups')
        .select('raised_amount')
        .eq('id', groupId)
        .single();
      if (!error) {
        await supabase
          .from('donation_groups')
          .update({ raised_amount: (data.raised_amount || 0) + amount })
          .eq('id', groupId);
        await supabase.from('donations').insert({
          donation_group_id: groupId,
          amount,
          donor_email: donorEmail,
          donor_name: donorName
        });
      }
    } catch (err) {
      await reportBug({
        type: 'StripeWebhook',
        message: err.message,
        stack: err.stack,
        context: { groupId }
      });
      console.error(err);
    }
  }
  res.json({ received: true });
});

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
  const { groupId, amount, donorName, donorEmail } = req.body;
  if (!groupId || !amount) return res.status(400).json({ error: 'missing data' });
  try {
    const { data: group, error } = await supabase.from('donation_groups').select('name').eq('id', groupId).single();
    if (error) throw error;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price_data: { currency: 'usd', unit_amount: Math.round(amount * 100), product_data: { name: group.name } }, quantity: 1 }],
      success_url: `${req.headers.origin}/donate/${groupId}?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/donate/${groupId}?canceled=1`,
      payment_intent_data: {
        metadata: { donorName: sanitize(donorName || ''), donorEmail: sanitize(donorEmail || ''), groupId }
      },
      customer_email: donorEmail ? sanitize(donorEmail) : undefined
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

// Backup a pet's full MemoryChain
app.post('/api/backup-memorychain', async (req, res) => {
  const { pet_id } = req.body;
  if (!pet_id) return res.status(400).json({ error: 'pet_id required' });

  try {
    const { data: pet, error: petErr } = await supabase
      .from('pets')
      .select('*')
      .eq('id', pet_id)
      .single();
    if (petErr) throw petErr;

    const { data: posts, error: postErr } = await supabase
      .from('posts')
      .select('*')
      .eq('pet_id', pet_id)
      .order('created_at');
    if (postErr) throw postErr;

    const { data: memorial } = await supabase
      .from('memorials')
      .select('*')
      .eq('pet_id', pet_id)
      .single();

    let pawflowers = [];
    if (memorial) {
      const { data: fl } = await supabase
        .from('pawflowers')
        .select('*')
        .eq('memorial_id', memorial.id)
        .order('created_at');
      pawflowers = fl || [];
    }

    let donations = [];
    const { data: groups } = await supabase
      .from('group_members')
      .select('groups(id,is_donation_group,donation_group_id)')
      .eq('pet_id', pet_id);
    const dgIds = (groups || [])
      .map(g => g.groups)
      .filter(g => g && g.is_donation_group && g.donation_group_id)
      .map(g => g.donation_group_id);
    if (dgIds.length) {
      const { data: dons } = await supabase
        .from('donations')
        .select('id,amount,donor_email,donor_name,created_at,donation_groups(name)')
        .in('donation_group_id', dgIds);
      donations = dons || [];
    }

    const backup = {
      pet,
      posts,
      memorial: memorial || null,
      pawflowers,
      donations
    };

    res.json({ status: 'ok', backup });
  } catch (err) {
    await reportBug({
      type: 'BackupMemoryChain',
      message: err.message,
      stack: err.stack,
      context: { pet_id }
    });
    console.error(err);
    res.status(500).json({ error: 'backup failed' });
  }
});

// Placeholder for future AI-generated MemoryBook
app.post('/api/generate-memorybook', (req, res) => {
  const { pet_id } = req.body;
  if (!pet_id) return res.status(400).json({ error: 'pet_id required' });
  res.json({ status: 'pending', message: 'MemoryBook generation coming soon' });
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
