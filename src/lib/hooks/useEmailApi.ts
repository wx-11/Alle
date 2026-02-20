import { useMemo } from 'react';
import { useSettingsStore } from '@/lib/store/settings';
import { useMutation, useQueryClient, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import useEmailStore from '@/lib/store/email';
import * as emailApi from '@/lib/api/email';
import type { Email, ExtractResultType } from '@/types';

type EmailListPage = {
  emails: Email[];
  total: number;
  nextOffset: number;
};

type EmailListInfiniteData = InfiniteData<EmailListPage, number>;


export const useEmailListInfinite = () => {
  const { groupByInbox } = useSettingsStore();
  const filters = useEmailStore((state) => state.filters);
  const selectedInbox = useEmailStore((state) => state.selectedInbox);

  const normalizedEmailTypes = useMemo(() => {
    return [...filters.emailTypes].sort();
  }, [filters.emailTypes]);

  const normalizedRecipients = useMemo(() => {
    // 分组模式下，如果选中了收件箱，强制使用该收件箱作为 recipient 过滤
    if (groupByInbox && selectedInbox) {
      return [selectedInbox];
    }
    return [...filters.recipients].sort();
  }, [filters.recipients, groupByInbox, selectedInbox]);

  const readStatusParam = filters.readStatus === 'read' ? 1 : filters.readStatus === 'unread' ? 0 : undefined;

  // 分组模式下每页 20 条，普通模式 50 条
  const pageSize = groupByInbox ? 20 : 50;

  return useInfiniteQuery({
    queryKey: ['emails', { readStatus: filters.readStatus, emailTypes: normalizedEmailTypes, recipients: normalizedRecipients, pageSize }],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await emailApi.fetchEmails({
        limit: pageSize,
        offset: pageParam,
        readStatus: readStatusParam,
        emailTypes: normalizedEmailTypes,
        recipients: normalizedRecipients,
      });

      return {
        emails: result.emails,
        total: result.total,
        nextOffset: pageParam + result.emails.length,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((acc, page) => acc + page.emails.length, 0);
      return loadedCount < lastPage.total ? lastPage.nextOffset : undefined;
    },
    initialPageParam: 0,
    // 分组模式下，未选择收件箱时不请求邮件列表
    enabled: !(groupByInbox && !selectedInbox),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });
};

export const useDeleteEmail = () => {
  const queryClient = useQueryClient();
  const { removeEmail } = useEmailStore();

  return useMutation({
    mutationFn: emailApi.deleteEmail,
    onSuccess: (emailId) => {
      removeEmail(emailId);
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['inboxes'] });
    },
  });
};

export const useBatchDeleteEmails = () => {
  const queryClient = useQueryClient();
  const { removeEmails } = useEmailStore();

  return useMutation({
    mutationFn: emailApi.batchDeleteEmails,
    onSuccess: (emailIds) => {
      removeEmails(emailIds);
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['inboxes'] });
    },
  });
};

export const useBatchDeleteByInbox = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailApi.batchDeleteByInbox,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['inboxes'] });
    },
  });
};

export const useMarkEmail = () => {
  const queryClient = useQueryClient();
  const { markEmail } = useEmailStore();

  return useMutation({
    mutationFn: ({ emailId, isRead }: { emailId: number; isRead: boolean }) => emailApi.mark(emailId, isRead),
    onSuccess: ({ emailId, isRead }) => {
      const readStatusValue = isRead ? 1 : 0;
      markEmail(emailId, isRead);

      queryClient.setQueriesData<EmailListInfiniteData>({ queryKey: ['emails'] }, (data) => {
        if (!data) {
          return data;
        }

        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            emails: page.emails.map((email) =>
              email.id === emailId ? { ...email, readStatus: readStatusValue } : email,
            ),
          })),
        };
      });

      // 刷新收件箱列表以更新未读计数
      queryClient.invalidateQueries({ queryKey: ['inboxes'] });
    },
  });
};

export const useRecipients = () => {
  return useQuery({
    queryKey: ['recipients'],
    queryFn: emailApi.fetchRecipients,
    staleTime: 5 * 60 * 1000,
  });
};

export const useInboxes = () => {
  return useQuery({
    queryKey: ['inboxes'],
    queryFn: emailApi.fetchInboxes,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });
};

export const useUpdateEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailId, emailResult, emailType }: {
      emailId: number;
      emailResult: string | null;
      emailType: ExtractResultType;
    }) => emailApi.updateEmail(emailId, emailResult, emailType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });
};

export const useTranslateEmail = () => {
  return useMutation({
    mutationFn: ({ content, contentHtml }: { content: string; contentHtml?: string }) =>
      emailApi.translateEmail(content, contentHtml),
  });
};
