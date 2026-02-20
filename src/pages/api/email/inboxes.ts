import withAuth from '@/lib/auth/auth';
import emailDB from '@/lib/db/email';

import { success, failure } from '@/types';

import type { Email, Inbox } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

function matchesRegex(email: Email, regex: RegExp): boolean {
  return (
    (email.title != null && regex.test(email.title)) ||
    (email.bodyText != null && regex.test(email.bodyText)) ||
    (email.fromName != null && regex.test(email.fromName)) ||
    (email.fromAddress != null && regex.test(email.fromAddress)) ||
    (email.toAddress != null && regex.test(email.toAddress))
  );
}

async function inboxesHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return failure(res, 'Method not allowed', 405);
  }

  const { search, search_regex } = req.query;
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

  try {
    if (searchRegExp) {
      // 正则模式：拉全量邮件，JS 过滤后按收件箱重新聚合
      const allEmails = await emailDB.list({ limit: 10000, offset: 0 });
      const filtered = allEmails.filter((e) => matchesRegex(e, searchRegExp!));

      const inboxMap = new Map<string, { total: number; unread: number }>();
      for (const e of filtered) {
        if (!e.toAddress) continue;
        const entry = inboxMap.get(e.toAddress) ?? { total: 0, unread: 0 };
        entry.total++;
        if (e.readStatus === 0) entry.unread++;
        inboxMap.set(e.toAddress, entry);
      }

      const inboxes: Inbox[] = Array.from(inboxMap.entries())
        .map(([address, stats]) => ({ address, ...stats }))
        .sort((a, b) => b.total - a.total);

      return success<Inbox[]>(res, inboxes);
    }

    // 普通模式：透传 search 给 DB
    const inboxes = await emailDB.getRecipientsWithCount(
      searchValue || undefined
    );
    return success<Inbox[]>(res, inboxes);
  } catch (e) {
    console.error('Failed to fetch inboxes:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return failure(res, errorMessage, 500);
  }
}

export default withAuth(inboxesHandler);
