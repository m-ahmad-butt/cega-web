const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const VISION_MODEL = process.env.VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

const genderOf = (value) => {
  const v = String(value || '').trim().toLowerCase();
  if (v.startsWith('m')) return 'Male';
  if (v.startsWith('f')) return 'Female';
  if (v) return 'Other';
  return '';
};

const dateOf = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parts = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!parts) return '';
  const day = parts[1].padStart(2, '0');
  const month = parts[2].padStart(2, '0');
  return `${parts[3]}-${month}-${day}`;
};

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
            'You extract fields from a Pakistan CNIC image, front and back. ' +
            'Return JSON only with keys: fullName, fatherName, cnic, dob (YYYY-MM-DD), gender (Male|Female|Other), address. ' +
            'fatherName is the Name of Father or Husband printed on the card. ' +
            'address is the current address, usually on the back. ' +
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
    fatherName: parsed.fatherName || '',
    cnic: parsed.cnic || '',
    dob: dateOf(parsed.dob),
    gender: genderOf(parsed.gender),
    address: parsed.address || '',
  };
};

module.exports = { extractCnicFields };
