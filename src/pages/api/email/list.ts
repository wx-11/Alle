import withAuth from '@/lib/auth/auth';
import emailDB from '@/lib/db/email';

import { success, failure } from '@/types';

import type { Email } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { ListParams } from '@/types';

function matchesRegex(email: Email, regex: RegExp): boolean {
  return (
    (email.title != null && regex.test(email.title)) ||
    (email.bodyText != null && regex.test(email.bodyText)) ||
    (email.fromName != null && regex.test(email.fromName)) ||
    (email.fromAddress != null && regex.test(email.fromAddress)) ||
    (email.toAddress != null && regex.test(email.toAddress))
  );
}

async function listHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return failure(res, 'Method not allowed', 405);
  }

  const { limit, offset, read_status, email_type, recipient, search, search_regex } = req.query;

  if (limit !== undefined) {
    const limitNum = Number(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return failure(res, 'Limit must be a number between 1 and 100', 400);
    }
  }

  if (offset !== undefined) {
    const offsetNum = Number(offset);
    if (isNaN(offsetNum) || offsetNum < 0) {
      return failure(res, 'Offset must be a non-negative number', 400);
    }
  }

  if (read_status !== undefined) {
    const readStatusNum = Number(read_status);
    if (isNaN(readStatusNum) || ![0, 1].includes(readStatusNum)) {
      return failure(res, 'read_status must be 0 (unread) or 1 (read)', 400);
    }
  }

  if (email_type !== undefined) {
    const validTypes = ['internal_link', 'auth_link', 'auth_code', 'service_link', 'subscription_link', 'other_link', 'none'];
    const types = (email_type as string).split(',').map(t => t.trim());
    for (const t of types) {
      if (!validTypes.includes(t)) {
        return failure(res, 'Invalid email type', 400);
      }
    }
  }

  let recipientValue: string | undefined;
  if (recipient !== undefined) {
    const recipientArray = Array.isArray(recipient) ? recipient : [recipient];
    const normalizedRecipients = recipientArray
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0)
      .join(',');

    if (!normalizedRecipients) {
      return failure(res, 'recipient must be a non-empty string', 400);
    }

    recipientValue = normalizedRecipients;
  }

  const searchValue = typeof search === 'string' ? search.trim() : undefined;
  const isRegex = search_regex === '1' || search_regex === 'true';

  // 正则模式下校验合法性
  let searchRegExp: RegExp | null = null;
  if (searchValue && isRegex) {
    try {
      searchRegExp = new RegExp(searchValue, 'i');
    } catch {
      return failure(res, 'Invalid regex pattern', 400);
    }
  }

  const params: ListParams = {
    limit: limit ? Number(limit) : 100,
    offset: offset ? Number(offset) : 0,
    readStatus: read_status ? Number(read_status) : undefined,
    emailType: email_type as string | undefined,
    recipient: recipientValue,
    // 普通模式：透传 search 给 DB；正则模式：不传（JS 过滤）
    search: searchValue && !isRegex ? searchValue : undefined,
  };

  try {
    if (searchRegExp) {
      // 正则模式：拉取全量数据（保留其他过滤条件），JS 过滤 + 手动分页
      const requestedLimit = params.limit!;
      const requestedOffset = params.offset!;
      // 拉全量：不限制 limit/offset
      const allData = await emailDB.list({ ...params, limit: 10000, offset: 0 });
      const filtered = allData.filter((e) => matchesRegex(e, searchRegExp!));
      const total = filtered.length;
      const data = filtered.slice(requestedOffset, requestedOffset + requestedLimit);
      return success<Email[]>(res, data, 200, { total });
    }

    const [data, total] = await Promise.all([
      emailDB.list(params),
      emailDB.count(params),
    ]);
    return success<Email[]>(res, data, 200, { total });
  } catch (e) {
    console.error('Failed to fetch emails:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return failure(res, errorMessage, 500);
  }
}

export default withAuth(listHandler);
