"use client";

import { useCallback, useState, useTransition, useEffect, type MouseEvent } from "react";
import { useDevice } from "@/provider/Device";
import useEmailStore from "@/lib/store/email";
import { useSettingsStore } from "@/lib/store/settings";
import { useDeleteEmail, useBatchDeleteEmails, useBatchDeleteByInbox, useEmailListInfinite, useInboxes } from "@/lib/hooks/useEmailApi";
import type { Email } from "@/types";
import EmailListHeader from "@/components/email/EmailListHeader";
import EmailListContent from "@/components/email/EmailListContent";
import { EmailListInteractionsProvider } from "@/components/email/EmailListInteractionsContext";
import MobileEmailDrawer from "@/components/email/MobileEmailDrawer";
import MobileSettingsDrawer from "@/components/email/MobileSettingsDrawer";
import EmailDetail from "@/components/email/EmailDetail";
import Settings from "@/components/Settings";
import InboxList, { InboxBackHeader } from "@/components/email/InboxList";

export default function EmailList() {
  const { isMobile } = useDevice();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set());
  const [selectedInboxes, setSelectedInboxes] = useState<Set<string>>(new Set());
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [, startTransition] = useTransition();

  const { groupByInbox } = useSettingsStore();
  const selectedInbox = useEmailStore((state) => state.selectedInbox);
  const setSelectedInbox = useEmailStore((state) => state.setSelectedInbox);

  // 收件箱列表数据（分组模式）
  const { data: inboxesData, isLoading: inboxesLoading, isFetching: inboxesFetching, refetch: refetchInboxes } = useInboxes();
  const inboxes = inboxesData ?? [];

  // 邮件列表数据
  const { data, isLoading, isFetching, refetch, fetchNextPage, hasNextPage } = useEmailListInfinite();
  const emails = useEmailStore((state) => state.emails);
  const selectedEmailId = useEmailStore((state) => state.selectedEmailId);
  const selectEmail = useEmailStore((state) => state.selectEmail);
  const settingsOpen = useEmailStore((state) => state.settingsOpen);
  const setSettingsOpen = useEmailStore((state) => state.setSettingsOpen);

  const deleteEmailMutation = useDeleteEmail();
  const batchDeleteMutation = useBatchDeleteEmails();
  const batchDeleteByInboxMutation = useBatchDeleteByInbox();

  useEffect(() => {
    if (data) {
      const allEmails = data.pages.flatMap((page) => page.emails);
      const total = data.pages[data.pages.length - 1]?.total || 0;
      const loadedCount = allEmails.length;
      const hasMore = loadedCount < total;
      useEmailStore.getState().setEmails(allEmails, total, hasMore);
    }
  }, [data]);

  // 切换分组模式时，重置选中的收件箱（不清空邮件数据）
  useEffect(() => {
    if (!groupByInbox) {
      useEmailStore.setState({ selectedInbox: null, selectedEmailId: null });
      setSelectedInboxes(new Set());
    }
  }, [groupByInbox]);

  const loading = isLoading || isFetching;
  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || null;

  // 是否显示收件箱列表（分组模式 && 未选择具体收件箱）
  const showInboxList = groupByInbox && !selectedInbox;

  const handleEmailClick = useCallback(
    (email: Email) => {
      startTransition(() => {
        selectEmail(email.id);
        setSettingsOpen(false);
      });
      if (isMobile) {
        setIsMobileDrawerOpen(true);
      }
    },
    [isMobile, selectEmail, setSettingsOpen],
  );

  const handleAvatarToggle = useCallback((email: Email, event: MouseEvent) => {
    event.stopPropagation();
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email.id)) {
        next.delete(email.id);
      } else {
        next.add(email.id);
      }
      return next;
    });
  }, []);

  const handleEmailDelete = useCallback(
    (emailId: number) => deleteEmailMutation.mutateAsync(emailId),
    [deleteEmailMutation],
  );

  const handleCopy = useCallback((id: string) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedEmails((prev) => {
      if (prev.size === emails.length && emails.length > 0) {
        return new Set();
      }
      return new Set(emails.map((email) => email.id));
    });
  }, [emails]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedEmails.size > 0) {
      await batchDeleteMutation.mutateAsync(Array.from(selectedEmails));
      setSelectedEmails(new Set());
    }
  }, [batchDeleteMutation, selectedEmails]);

  // 收件箱选择：切换单个
  const handleInboxToggle = useCallback((address: string) => {
    setSelectedInboxes((prev) => {
      const next = new Set(prev);
      if (next.has(address)) {
        next.delete(address);
      } else {
        next.add(address);
      }
      return next;
    });
  }, []);

  // 收件箱选择：全选/取消全选
  const handleToggleSelectAllInboxes = useCallback(() => {
    setSelectedInboxes((prev) => {
      if (prev.size === inboxes.length && inboxes.length > 0) {
        return new Set();
      }
      return new Set(inboxes.map((inbox) => inbox.address));
    });
  }, [inboxes]);

  // 收件箱选择：批量删除
  const handleBatchDeleteInboxes = useCallback(async () => {
    if (selectedInboxes.size > 0) {
      await batchDeleteByInboxMutation.mutateAsync(Array.from(selectedInboxes));
      setSelectedInboxes(new Set());
    }
  }, [batchDeleteByInboxMutation, selectedInboxes]);

  const handleOpenSettings = useCallback(() => {
    if (isMobile) {
      setMobileSettingsOpen(true);
    } else {
      startTransition(() => {
        setSettingsOpen(true);
        selectEmail(null);
      });
    }
  }, [isMobile, selectEmail, setSettingsOpen]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetching) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetching, fetchNextPage]);

  const handleSelectInbox = useCallback((address: string) => {
    setSelectedInbox(address);
    setSelectedEmails(new Set());
    setSelectedInboxes(new Set());
  }, [setSelectedInbox]);

  const handleBackToInboxes = useCallback(() => {
    setSelectedInbox(null);
    setSelectedEmails(new Set());
    setSelectedInboxes(new Set());
    selectEmail(null);
  }, [setSelectedInbox, selectEmail]);

  const handleRefresh = useCallback(() => {
    if (showInboxList) {
      void refetchInboxes();
    } else {
      void refetch();
    }
  }, [showInboxList, refetchInboxes, refetch]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden">
        <aside className="w-full md:w-[380px] lg:w-[420px] flex-shrink-0 border-r border-border flex flex-col bg-card overflow-hidden">
          <EmailListHeader
            selectedEmails={selectedEmails}
            loading={showInboxList ? (inboxesLoading || inboxesFetching) : loading}
            onRefresh={handleRefresh}
            onToggleSelectAll={handleToggleSelectAll}
            onBatchDelete={handleBatchDelete}
            onClearSelection={() => setSelectedEmails(new Set())}
            onOpenSettings={handleOpenSettings}
            selectedInboxes={selectedInboxes}
            inboxCount={inboxes.length}
            onToggleSelectAllInboxes={handleToggleSelectAllInboxes}
            onBatchDeleteInboxes={handleBatchDeleteInboxes}
            onClearInboxSelection={() => setSelectedInboxes(new Set())}
            onBackToInboxes={handleBackToInboxes}
          />

          {/* 分组模式下选中收件箱时显示返回头 */}
          {groupByInbox && selectedInbox && (
            <InboxBackHeader selectedInbox={selectedInbox} onBack={handleBackToInboxes} />
          )}

          <div className="flex-1 overflow-hidden">
            {showInboxList ? (
              // 分组模式：显示收件箱列表
              <InboxList
                inboxes={inboxes}
                loading={inboxesLoading || inboxesFetching}
                onSelectInbox={handleSelectInbox}
                selectedInboxes={selectedInboxes}
                onInboxToggle={handleInboxToggle}
              />
            ) : (
              // 普通模式或分组模式下选中了收件箱：显示邮件列表
              <EmailListInteractionsProvider
                value={{
                  copiedId,
                  onCopy: handleCopy,
                  onEmailClick: handleEmailClick,
                  onEmailDelete: handleEmailDelete,
                  onAvatarToggle: handleAvatarToggle,
                }}
              >
                <EmailListContent
                  emails={emails}
                  loading={loading}
                  hasMore={hasNextPage}
                  onLoadMore={handleLoadMore}
                  onRefresh={handleRefresh}
                  selectedEmailId={selectedEmailId}
                  selectedEmails={selectedEmails}
                />
              </EmailListInteractionsProvider>
            )}
          </div>
        </aside>

        <main className="hidden md:flex flex-1 bg-background overflow-hidden">
          <div className="w-full max-w-5xl mx-auto">{settingsOpen ? <Settings /> : <EmailDetail email={selectedEmail} />}</div>
        </main>
      </div>

      <MobileEmailDrawer open={isMobileDrawerOpen} email={selectedEmail} onClose={() => setIsMobileDrawerOpen(false)} />

      <MobileSettingsDrawer open={mobileSettingsOpen} onOpenChange={setMobileSettingsOpen} />
    </div>
  );
}
