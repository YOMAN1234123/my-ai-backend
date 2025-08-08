import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { message, websiteUrl } = req.body || {};

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY in environment.' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  // Try to fetch website content (safe & short)
  let websiteContent = '';
  if (websiteUrl) {
    try {
      const r = await fetch(websiteUrl);
      const html = await r.text();
      // keep it short and remove extra whitespace
      websiteContent = html.replace(/\s+/g, ' ').slice(0, 1500);
    } catch (e) {
      websiteContent = 'Could not fetch website content.';
    }
  }

  const prompt = `
Website content:
${websiteContent}

User question: ${message}
`;

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500
      })
    });

    const data = await openaiRes.json();
    const reply = data?.choices?.[0]?.message?.content || 'No answer from AI.';
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'OpenAI error' });
  }
}

