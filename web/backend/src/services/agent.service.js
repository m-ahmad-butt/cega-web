const axios = require('axios');

const AGENT_URL = process.env.AGENT_URL || 'http://agent:8002';
const AGENT_SECRET = process.env.AGENT_SECRET || 'examslot-agent-secret';

const client = axios.create({
  baseURL: AGENT_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'X-Agent-Secret': AGENT_SECRET,
  },
});

const chat = async (payload) => {
  const { data } = await client.post('/v1/chat', payload);
  return data;
};

const reset = async (payload) => {
  const { data } = await client.post('/v1/reset', payload);
  return data;
};

module.exports = { chat, reset, AGENT_URL };
