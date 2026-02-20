import withAuth from '@/lib/auth/auth';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import OpenAI from 'openai';

import { success, failure } from '@/types';

import type { NextApiRequest, NextApiResponse } from 'next';

const PARAGRAPH_SEPARATOR = '%%';

function detectLanguage(text: string): 'zh' | 'other' {
  // 统计中文字符占比，超过 30% 视为中文
  const chineseChars = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  const ratio = (chineseChars?.length ?? 0) / Math.max(text.length, 1);
  return ratio > 0.3 ? 'zh' : 'other';
}

function buildPrompt(targetLang: string): string {
  return `You are a professional ${targetLang} native translator who needs to fluently translate text into ${targetLang}.

## Translation Rules
1. Output only the translated content, without explanations or additional content (such as "Here's the translation:" or "Translation as follows:")
2. The returned translation must maintain exactly the same number of paragraphs and format as the original text
3. For content that should not be translated (such as proper nouns, brand names, URLs, email addresses, code, numbers), keep the original text
4. If input contains ${PARAGRAPH_SEPARATOR}, use ${PARAGRAPH_SEPARATOR} in your output. If input has no ${PARAGRAPH_SEPARATOR}, don't use ${PARAGRAPH_SEPARATOR} in your output

## OUTPUT FORMAT:
- **Single paragraph input** → Output translation directly (no separators, no extra text)
- **Multi-paragraph input** → Use ${PARAGRAPH_SEPARATOR} as paragraph separator between translations

## Examples
### Multi-paragraph Input:
Paragraph A
${PARAGRAPH_SEPARATOR}
Paragraph B
${PARAGRAPH_SEPARATOR}
Paragraph C

### Multi-paragraph Output:
Translation A
${PARAGRAPH_SEPARATOR}
Translation B
${PARAGRAPH_SEPARATOR}
Translation C

### Single paragraph Input:
Single paragraph content

### Single paragraph Output:
Direct translation without separators

Translate to ${targetLang} (output translation only):`;
}

/** 将多段文本用 %% 分隔，发给 AI 后再还原 */
function preProcess(text: string): string {
  // 按连续空行分段
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length <= 1) return text.trim();
  return paragraphs.join(`\n${PARAGRAPH_SEPARATOR}\n`);
}

function postProcess(translated: string, originalText: string): string {
  const originalParagraphs = originalText.split(/\n{2,}/).filter(p => p.trim());
  if (originalParagraphs.length <= 1) return translated.trim();

  // 还原 %% 为双换行
  return translated
    .split(PARAGRAPH_SEPARATOR)
    .map(p => p.trim())
    .filter(Boolean)
    .join('\n\n');
}

async function translateWithOpenAI(
  content: string,
  prompt: string,
  env: CloudflareEnv
): Promise<string> {
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL,
  });

  const response = await client.chat.completions.create({
    model: env.EXTRACT_MODEL,
    messages: [
      { role: 'system', content: prompt },
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
  prompt: string,
  env: CloudflareEnv
): Promise<string> {
  const result = await env.AI.run(env.EXTRACT_MODEL as keyof AiModels, {
    messages: [
      { role: 'system', content: prompt },
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

  if (content.length > 50000) {
    return failure(res, 'Content too long, max 50000 characters', 400);
  }

  try {
    const { env } = await getCloudflareContext();

    // 检测语言，确定翻译方向
    const lang = detectLanguage(content);
    const targetLang = lang === 'zh' ? 'English' : 'Simplified Chinese';
    const prompt = buildPrompt(targetLang);

    // 预处理：段落分隔
    const processed = preProcess(content);

    let translated: string;
    if (env.OPENAI_BASE_URL && env.OPENAI_API_KEY) {
      translated = await translateWithOpenAI(processed, prompt, env);
    } else {
      translated = await translateWithCloudflareAI(processed, prompt, env);
    }

    // 后处理：还原段落结构
    const result = postProcess(translated, content);

    return success<string>(res, result);
  } catch (e) {
    console.error('Translation error:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return failure(res, errorMessage, 500);
  }
}

export default withAuth(translateHandler);
