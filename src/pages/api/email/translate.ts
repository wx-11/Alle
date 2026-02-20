import withAuth from '@/lib/auth/auth';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import OpenAI from 'openai';

import { success, failure } from '@/types';

import type { NextApiRequest, NextApiResponse } from 'next';

const TRANSLATE_PROMPT = `You are a professional translator. Your ONLY job is to translate the human-readable text strings in the input.

# Language Direction
- If the text is Chinese (Simplified or Traditional) → translate to English.
- If the text is any other language → translate to Simplified Chinese.

# What to Translate
- ONLY translate human-readable text strings (words, sentences, paragraphs).

# What to Keep UNCHANGED (do NOT touch)
- ALL HTML tags, attributes, and structure (e.g. <div class="x">, <a href="...">, <br/>, &nbsp;)
- ALL URLs, email addresses, domain names
- ALL numbers, dates, timestamps in their original format
- ALL punctuation and symbols that are part of formatting (—, ·, |, /, etc.)
- ALL code snippets, variable names, CSS classes
- ALL proper nouns, brand names, product names
- ALL line breaks, whitespace, indentation — preserve the exact same structure

# Output Rules
- Return ONLY the translated result. No notes, no explanations, no markdown wrappers.
- The output must have the EXACT same structure and formatting as the input.
- If the input is HTML, the output must be valid HTML with identical tag structure.`;

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
