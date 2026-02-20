import withAuth from '@/lib/auth/auth';
import emailDB from '@/lib/db/email';

import { success, failure } from '@/types';

import type { NextApiRequest, NextApiResponse } from 'next';

async function deleteByInboxHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return failure(res, 'Method not allowed', 405);
  }

  const addresses = req.body;

  if (!Array.isArray(addresses)) {
    return failure(res, 'Request body must be an array of recipient addresses', 400);
  }

  if (addresses.length === 0) {
    return failure(res, 'At least one recipient address is required', 400);
  }

  const invalidAddresses = addresses.filter(
    (addr) => typeof addr !== 'string' || addr.trim().length === 0
  );

  if (invalidAddresses.length > 0) {
    return failure(res, 'All addresses must be non-empty strings', 400);
  }

  try {
    await emailDB.deleteByRecipients(addresses);
    return success(res, null, 200);
  } catch (e) {
    console.error('Failed to delete emails by inbox:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return failure(res, errorMessage, 500);
  }
}

export default withAuth(deleteByInboxHandler);
