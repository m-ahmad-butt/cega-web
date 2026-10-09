const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const VISION_MODEL = process.env.VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

const extractJson = (text) => {
  const trimmed = (text || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Vision model did not return JSON');
  }
};

/**
 * OCR a CNIC image (base64 without data-url prefix) via Groq vision.
 */
const extractCnicFields = async (base64, mimeType = 'image/jpeg') => {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const dataUrl = `data:${mimeType};base64,${base64}`;
  const { data } = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: VISION_MODEL,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You extract fields from a Pakistan CNIC / B-Form image. ' +
            'Return JSON only with keys: fullName, cnic, dob (YYYY-MM-DD), gender (Male|Female|Other), address. ' +
            'Use null for unknown fields. Normalize CNIC as #####-#######-# when possible.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract CNIC details as JSON.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );

  const content = data?.choices?.[0]?.message?.content || '';
  const parsed = extractJson(content);
  return {
    fullName: parsed.fullName || '',
    cnic: parsed.cnic || '',
    dob: parsed.dob || '',
    gender: parsed.gender || '',
    address: parsed.address || '',
  };
};

module.exports = { extractCnicFields };
