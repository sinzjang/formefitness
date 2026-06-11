// OpenAI · Claude · Gemini 통합 채팅 API
import type { AiProvider } from '../types/ai';
import { getActiveAiConfig, resolveApiKey, resolveModel } from '../stores/aiSettingsStore';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface VisionImageInput {
  base64: string;
  mediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

async function callOpenAi(
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  maxTokens: number
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return String(data.choices?.[0]?.message?.content ?? '');
}

async function callClaude(
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  maxTokens: number
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return String(data.content?.[0]?.text ?? '');
}

async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  maxTokens: number
): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return String(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
}

async function dispatch(
  provider: AiProvider,
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  maxTokens: number
): Promise<string> {
  switch (provider) {
    case 'openai':
      return callOpenAi(apiKey, model, system, messages, maxTokens);
    case 'claude':
      return callClaude(apiKey, model, system, messages, maxTokens);
    case 'gemini':
      return callGemini(apiKey, model, system, messages, maxTokens);
  }
}

/** 활성 프로바이더로 채팅 완성 */
export async function sendChatCompletion(
  system: string,
  messages: ChatMessage[],
  maxTokens = 1024
): Promise<string> {
  const { provider, apiKey, model } = getActiveAiConfig();
  if (!apiKey) throw new Error('API_KEY_MISSING');
  return dispatch(provider, apiKey, model, system, messages, maxTokens);
}

export async function sendVisionCompletion(
  system: string,
  prompt: string,
  images: VisionImageInput[],
  maxTokens = 1200
): Promise<string> {
  const { provider, apiKey, model } = getActiveAiConfig();
  if (!apiKey) throw new Error('API_KEY_MISSING');

  switch (provider) {
    case 'claude': {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system,
          messages: [
            {
              role: 'user',
              content: [
                ...images.map((image) => ({
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: image.mediaType ?? 'image/jpeg',
                    data: image.base64,
                  },
                })),
                { type: 'text', text: prompt },
              ],
            },
          ],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return String(data.content?.[0]?.text ?? '');
    }
    case 'openai': {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: system },
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                ...images.map((image) => ({
                  type: 'image_url',
                  image_url: {
                    url: `data:${image.mediaType ?? 'image/jpeg'};base64,${image.base64}`,
                    detail: 'low',
                  },
                })),
              ],
            },
          ],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return String(data.choices?.[0]?.message?.content ?? '');
    }
    case 'gemini': {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  ...images.map((image) => ({
                    inlineData: {
                      mimeType: image.mediaType ?? 'image/jpeg',
                      data: image.base64,
                    },
                  })),
                ],
              },
            ],
            generationConfig: { maxOutputTokens: maxTokens },
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return String(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
    }
  }
}

/** 설정 화면 — 특정 프로바이더 키 유효성 간단 체크 */
export async function testProviderConnection(provider: AiProvider): Promise<boolean> {
  const apiKey = resolveApiKey(provider);
  if (!apiKey) return false;
  const model = resolveModel(provider);
  try {
    const text = await dispatch(
      provider,
      apiKey,
      model,
      'You are a test assistant.',
      [{ role: 'user', content: 'Reply with exactly: OK' }],
      16
    );
    return text.trim().length > 0;
  } catch {
    return false;
  }
}
