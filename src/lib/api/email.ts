import { apiFetch, ApiError } from './client';

import type { Email, ApiResponse, ExtractResultType, Inbox } from '@/types';

interface FetchEmailsParams {
    limit?: number;
    offset?: number;
    readStatus?: number;
    emailTypes?: ExtractResultType[];
    recipients?: string[];
}

export async function fetchEmails({
    limit = 50,
    offset = 0,
    readStatus,
    emailTypes = [],
    recipients = [],
}: FetchEmailsParams = {}) {
    const searchParams = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
    });

    if (typeof readStatus === 'number') {
        searchParams.set('read_status', String(readStatus));
    }

    if (emailTypes.length > 0) {
        searchParams.set('email_type', emailTypes.join(','));
    }

    if (recipients.length > 0) {
        searchParams.set('recipient', recipients.join(','));
    }

    const response = await apiFetch(`/api/email/list?${searchParams.toString()}`);

    if (!response.ok) {
        throw new ApiError('Failed to fetch emails', response.status);
    }

    const data = (await response.json()) as ApiResponse<Email[]>;

    if (!data.success || !data.data) {
        throw new ApiError(data.error || 'Failed to fetch emails', response.status);
    }

    return {
        emails: data.data,
        total: data.total || 0,
    };
}

export async function deleteEmail(emailId: number) {
    const response = await apiFetch('/api/email/delete', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify([emailId]),
    });

    const data = (await response.json()) as ApiResponse<null>;

    if (!data.success) {
        throw new ApiError(data.error || 'Failed to delete email', response.status);
    }

    return emailId;
}

export async function batchDeleteEmails(emailIds: number[]) {
    const response = await apiFetch('/api/email/delete', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailIds),
    });

    const data = (await response.json()) as ApiResponse<null>;

    if (!data.success) {
        throw new ApiError(data.error || 'Failed to delete emails', response.status);
    }

    return emailIds;
}

export async function batchDeleteByInbox(addresses: string[]) {
    const response = await apiFetch('/api/email/delete-by-inbox', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(addresses),
    });

    const data = (await response.json()) as ApiResponse<null>;

    if (!data.success) {
        throw new ApiError(data.error || 'Failed to delete emails by inbox', response.status);
    }

    return addresses;
}

export async function updateEmail(emailId: number, emailResult: string | null, emailType: ExtractResultType) {
    const response = await apiFetch('/api/email/update', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailId, emailResult, emailType }),
    });

    const data = (await response.json()) as ApiResponse<null>;

    if (!data.success) {
        throw new ApiError(data.error || 'Failed to update email', response.status);
    }

    return { emailId, emailResult, emailType };
}

export async function fetchRecipients() {
    const response = await apiFetch('/api/email/recipients');

    if (!response.ok) {
        throw new ApiError('Failed to fetch recipients', response.status);
    }

    const data = (await response.json()) as ApiResponse<string[]>;

    if (!data.success || !data.data) {
        throw new ApiError(data.error || 'Failed to fetch recipients', response.status);
    }

    return data.data;
}

export async function mark(id: number, isRead: boolean) {
    const searchParams = new URLSearchParams({
        id: String(id),
        is_read: isRead ? '1' : '0',
    });

    const response = await apiFetch(`/api/email/mark?${searchParams.toString()}`, {
        method: 'POST',
    });

    if (!response.ok) {
        throw new ApiError('Failed to update email read status', response.status);
    }

    const data = (await response.json()) as ApiResponse<null>;

    if (!data.success) {
        throw new ApiError(data.error || 'Failed to update email read status', response.status);
    }

    return { emailId: id, isRead };
}

export async function fetchInboxes() {
    const response = await apiFetch('/api/email/inboxes');

    if (!response.ok) {
        throw new ApiError('Failed to fetch inboxes', response.status);
    }

    const data = (await response.json()) as ApiResponse<Inbox[]>;

    if (!data.success || !data.data) {
        throw new ApiError(data.error || 'Failed to fetch inboxes', response.status);
    }

    return data.data;
}

export interface TranslateResult {
    text: string | null;
    html: string | null;
}

export async function translateEmail(content: string, contentHtml?: string): Promise<TranslateResult> {
    const response = await apiFetch('/api/email/translate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, contentHtml }),
    });

    if (!response.ok) {
        throw new ApiError('Failed to translate email', response.status);
    }

    const data = (await response.json()) as ApiResponse<TranslateResult>;

    if (!data.success || !data.data) {
        throw new ApiError(data.error || 'Failed to translate email', response.status);
    }

    return data.data;
}