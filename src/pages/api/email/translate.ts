import withAuth from '@/lib/auth/auth';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import OpenAI from 'openai';

import { success, failure } from '@/types';

import type { NextApiRequest, NextApiResponse } from 'next';

const PARAGRAPH_SEPARATOR = '%%';

function detectLanguage(text: string): 'zh' | 'other' {
  const chineseChars = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  const ratio = (chineseChars?.length ?? 0) / Math.max(text.length, 1);
  return ratio > 0.3 ? 'zh' : 'other';
}

function buildPlainTextPrompt(targetLang: string): string {
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

### Multi-paragraph Output:
Translation A
${PARAGRAPH_SEPARATOR}
Translation B

Translate to ${targetLang} (output translation only):`;
}

function buildHtmlPrompt(targetLang: string): string {
  return `You are a professional ${targetLang} native translator. Translate the text content within the HTML into ${targetLang}.

## CRITICAL RULES
1. Output ONLY the translated HTML. No explanations, no markdown code fences, no extra text.
2. ONLY translate human-readable text content (the text users see). Do NOT touch anything else.
3. Keep ALL HTML tags, attributes, styles, classes, IDs completely unchanged.
4. Keep ALL URLs, href values, src values, email addresses unchanged.
5. Keep ALL proper nouns, brand names, product names, code snippets unchanged.
6. The output must be valid HTML with the EXACT same tag structure as the input.
7. Do NOT add, remove, or reorder any HTML tags.
8. Do NOT wrap output in \`\`\`html or any code block.

Translate to ${targetLang} (output translated HTML only):`;
}

function preProcess(text: string): string {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length <= 1) return text.trim();
  return paragraphs.join(`\n${PARAGRAPH_SEPARATOR}\n`);
}

function postProcess(translated: string, originalText: string): string {
  const originalParagraphs = originalText.split(/\n{2,}/).filter(p => p.trim());
  if (originalParagraphs.length <= 1) return translated.trim();

  return translated
    .split(PARAGRAPH_SEPARATOR)
    .map(p => p.trim())
    .filter(Boolean)
    .join('\n\n');
}

/** 清理 AI 返回的 HTML（去除可能包裹的 markdown code fence） */
function cleanHtmlResponse(html: string): string {
  let cleaned = html.trim();
  // 去除 ```html ... ``` 包裹
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return cleaned.trim();
}

async function callOpenAI(
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
    max_tokens: 16384,
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

async function callCloudflareAI(
  content: string,
  prompt: string,
  env: CloudflareEnv
): Promise<string> {
  const result = await env.AI.run(env.EXTRACT_MODEL as keyof AiModels, {
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content },
    ],
    max_tokens: 16384,
    stream: false,
  });

  // @ts-expect-error result.response
  const response = result.response;

  if (typeof response === 'string') {
    return response;
  }

  throw new Error('Unexpected response format from Cloudflare AI');
}

async function translate(content: string, prompt: string, env: CloudflareEnv): Promise<string> {
  if (env.OPENAI_BASE_URL && env.OPENAI_API_KEY) {
    return callOpenAI(content, prompt, env);
  }
  return callCloudflareAI(content, prompt, env);
}

async function translateHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return failure(res, 'Method not allowed', 405);
  }

  const { content, contentHtml } = req.body as { content?: string; contentHtml?: string };

  if (!content || typeof content !== 'string') {
    return failure(res, 'content is required and must be a string', 400);
  }

  const totalLength = (content?.length ?? 0) + (contentHtml?.length ?? 0);
  if (totalLength > 100000) {
    return failure(res, 'Content too long', 400);
  }

  try {
    const { env } = await getCloudflareContext();

    const lang = detectLanguage(content);
    const targetLang = lang === 'zh' ? 'English' : 'Simplified Chinese';

    // 纯文本翻译（始终执行，作为 text 结果）
    const plainPrompt = buildPlainTextPrompt(targetLang);
    const processed = preProcess(content);
    const translatedPlain = await translate(processed, plainPrompt, env);
    const textResult = postProcess(translatedPlain, content);

    // HTML 翻译（如果有 contentHtml 则额外翻译）
    let htmlResult: string | null = null;
    if (contentHtml && typeof contentHtml === 'string' && contentHtml.length > 0) {
      try {
        const htmlPrompt = buildHtmlPrompt(targetLang);
        const rawHtml = await translate(contentHtml, htmlPrompt, env);
        htmlResult = cleanHtmlResponse(rawHtml);
      } catch (e) {
        // HTML 翻译失败不影响整体，fallback 到纯文本
        console.error('HTML translation failed, falling back to text:', e);
      }
    }

    return success<{ text: string; html: string | null }>(res, { text: textResult, html: htmlResult });
  } catch (e) {
    console.error('Translation error:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return failure(res, errorMessage, 500);
  }
}

export default withAuth(translateHandler);
