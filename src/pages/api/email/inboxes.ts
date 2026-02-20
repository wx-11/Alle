import withAuth from '@/lib/auth/auth';
import emailDB from '@/lib/db/email';

import { success, failure } from '@/types';

import type { Inbox } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

async function inboxesHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return failure(res, 'Method not allowed', 405);
  }

  try {
    const inboxes = await emailDB.getRecipientsWithCount();
    return success<Inbox[]>(res, inboxes);
  } catch (e) {
    console.error('Failed to fetch inboxes:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return failure(res, errorMessage, 500);
  }
}

export default withAuth(inboxesHandler);
