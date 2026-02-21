import withAuth from '@/lib/auth/auth';
import emailDB from '@/lib/db/email';

import { success, failure } from '@/types';

import type { NextApiRequest, NextApiResponse } from 'next';

async function markAllReadHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return failure(res, 'Method not allowed', 405);
  }

  const { recipient } = req.query;
  const recipientValue = typeof recipient === 'string' ? recipient.trim() : undefined;

  try {
    const count = await emailDB.markAllAsRead(recipientValue || undefined);
    return success(res, { count }, 200);
  } catch (e) {
    console.error('Failed to mark all as read:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return failure(res, errorMessage, 500);
  }
}

export default withAuth(markAllReadHandler);
