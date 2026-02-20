import { apiFetch, ApiError } from './client';

import type { ApiResponse } from '@/types';

export async function revokeAllTokens(): Promise<void> {
    const response = await apiFetch('/api/auth/revoke', {
        method: 'POST',
    });

    if (!response.ok) {
        throw new ApiError('Failed to revoke tokens', response.status);
    }

    const data = (await response.json()) as ApiResponse<{ revokedBefore: number }>;

    if (!data.success) {
        throw new ApiError(data.error || 'Failed to revoke tokens', response.status);
    }
}
