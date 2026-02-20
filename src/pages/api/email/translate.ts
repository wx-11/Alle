import withAuth from '@/lib/auth/auth';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import OpenAI from 'openai';

import { success, failure } from '@/types';

import type { NextApiRequest, NextApiResponse } from 'next';

const TRANSLATE_PROMPT = `You are a professional translator. Translate the following email content accurately and naturally.

# Rules
1. Detect the source language automatically.
2. If the source language is Chinese (Simplified or Traditional), translate to English.
3. If the source language is any other language, translate to Simplified Chinese.
4. Preserve the original formatting structure (paragraphs, line breaks, lists, etc.).
5. Translate naturally — do not translate literally word-by-word. Adapt to the target language's conventions.
6. Keep proper nouns, brand names, URLs, email addresses, and code snippets unchanged.
7. Keep the tone consistent with the original (formal/informal/technical).
8. Do NOT add any notes, explanations, or commentary — return ONLY the translated text.
9. If the content contains HTML tags, preserve them and only translate the text content within the tags.`;

async function translateWithOpenAI(
  content: string,
  env: CloudflareEnv
): Promise<string> {
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL,
  });

  const response = await client.chat.completions.create({
    model: env.EXTRACT_MODEL,
    messages: [
      { role: 'system', content: TRANSLATE_PROMPT },
      { role: 'user', content },
    ],
  });

  const result = response.choices[0].message.content;
  if (!result) {
    throw new Error('AI returned empty response');
  }

  return result;
}

async function translateWithCloudflareAI(
  content: string,
  env: CloudflareEnv
): Promise<string> {
  const result = await env.AI.run(env.EXTRACT_MODEL as keyof AiModels, {
    messages: [
      { role: 'system', content: TRANSLATE_PROMPT },
      { role: 'user', content },
    ],
    stream: false,
  });

  // @ts-expect-error result.response
  const response = result.response;

  if (typeof response === 'string') {
    return response;
  }

  throw new Error('Unexpected response format from Cloudflare AI');
}

async function translateHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return failure(res, 'Method not allowed', 405);
  }

  const { content } = req.body as { content?: string };

  if (!content || typeof content !== 'string') {
    return failure(res, 'content is required and must be a string', 400);
  }

  // 限制内容长度，避免过大的请求
  if (content.length > 50000) {
    return failure(res, 'Content too long, max 50000 characters', 400);
  }

  try {
    const { env } = await getCloudflareContext();

    let translated: string;
    if (env.OPENAI_BASE_URL && env.OPENAI_API_KEY) {
      translated = await translateWithOpenAI(content, env);
    } else {
      translated = await translateWithCloudflareAI(content, env);
    }

    return success<string>(res, translated);
  } catch (e) {
    console.error('Translation error:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return failure(res, errorMessage, 500);
  }
}

export default withAuth(translateHandler);
