# ExamSlot Schedule Agent

Python FastAPI service with LangGraph architecture + Redis Mem0-style memory.

## Flow

1. Need course difficulty? → ask student only for uncertain courses  
2. Rank preferences & prep needs  
3. Generate schedule from available slots  
4. Valid? → show proposed date sheet → Accept → Apply  
5. Else / Reject → explain conflicts, reask prefs (loop)

## Endpoints

- `GET /health`
- `GET /v1/architecture`
- `POST /v1/chat` (header `X-Agent-Secret`)
- `POST /v1/reset`

## Env

See `.env.example`. Uses `GROQ_API_KEY`, `LLM_MODEL`, `REDIS_URL`, `AGENT_SECRET`.
