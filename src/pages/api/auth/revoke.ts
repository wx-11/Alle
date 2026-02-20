import { success, failure } from '@/types';
import settingsDB from '@/lib/db/settings';
import withAuth from '@/lib/auth/auth';

import type { NextApiRequest, NextApiResponse } from 'next';

export default withAuth(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return failure(res, 'Method not allowed', 405);
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    await settingsDB.set('token_revoked_before', String(now));
    return success(res, { revokedBefore: now }, 200);
  } catch (e) {
    console.error('Failed to revoke tokens:', e);
    return failure(res, 'Failed to revoke tokens', 500);
  }
});
