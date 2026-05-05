import { logStructured } from './runtime-security';

export type AiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function callOpenRouter(messages: AiMessage[]): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    logStructured('openrouter_api_key_missing', {});
    return null;
  }

  const model = process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-72b-instruct';

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://www.nodoai.co', // Required by OpenRouter
        'X-Title': 'Agenda Reuniones Vecinos',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      logStructured('openrouter_call_failed', { status: response.status });
      return null;
    }

    const json = await response.json();
    return json.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (error) {
    logStructured('openrouter_exception', { error: (error as Error).message });
    return null;
  }
}

export async function parseIntentWithQwen(text: string): Promise<any> {
  const prompt = `Actúa como un asistente administrativo experto. Tu tarea es extraer información estructurada de mensajes de vecinos para agendar reuniones o llamados.
  
  Formato de salida esperado (JSON puro):
  {
    "eventType": "reunion" | "llamado",
    "citizenName": "Nombre completo",
    "day": 1-31,
    "month": "enero"..."diciembre",
    "hour": 0-23,
    "minute": 0-59,
    "topic": "Resumen del tema",
    "location": "Lugar mencionado o nulo",
    "detail": "Detalles adicionales o nulo"
  }

  Si falta información, intenta inferirla o pon null.
  Mensaje del vecino: "${text}"`;

  const result = await callOpenRouter([
    { role: 'system', content: 'Eres un extractor de datos JSON preciso.' },
    { role: 'user', content: prompt }
  ]);

  if (!result) return null;

  try {
    // Limpiar posibles bloques de código markdown
    const cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch {
    logStructured('qwen_parse_json_failed', { result });
    return null;
  }
}
