"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Settings as SettingsIcon, CheckSquare, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DeleteDialog from "@/components/common/DeleteDialog";
import useTranslation from "@/lib/hooks/useTranslation";
import useEmailStore from "@/lib/store/email";
import { useSettingsStore } from "@/lib/store/settings";

interface EmailListHeaderProps {
  selectedEmails: Set<number>;
  loading: boolean;
  onRefresh: () => void;
  onToggleSelectAll: () => void;
  onBatchDelete: () => Promise<void> | void;
  onClearSelection: () => void;
  onOpenSettings: () => void;
  // 收件箱批量选择
  selectedInboxes?: Set<string>;
  inboxCount?: number;
  onToggleSelectAllInboxes?: () => void;
  onBatchDeleteInboxes?: () => Promise<void> | void;
  onClearInboxSelection?: () => void;
}

export default function EmailListHeader({
  selectedEmails,
  loading,
  onRefresh,
  onToggleSelectAll,
  onBatchDelete,
  onClearSelection,
  onOpenSettings,
  selectedInboxes,
  inboxCount = 0,
  onToggleSelectAllInboxes,
  onBatchDeleteInboxes,
  onClearInboxSelection,
}: EmailListHeaderProps) {
  const { t } = useTranslation();
  const totalCount = useEmailStore((state) => state.total);
  const emailCount = useEmailStore((state) => state.emails.length);
  const { groupByInbox } = useSettingsStore();
  const selectedInbox = useEmailStore((state) => state.selectedInbox);

  const selectionCount = selectedEmails.size;
  const hasSelection = selectionCount > 0;
  const isAllSelected = hasSelection && selectionCount === emailCount;

  // 分组模式下未选择收件箱时，显示"收件箱"标题
  const showInboxListMode = groupByInbox && !selectedInbox;

  // 收件箱选择状态
  const inboxSelectionCount = selectedInboxes?.size ?? 0;
  const hasInboxSelection = inboxSelectionCount > 0;
  const isAllInboxesSelected = hasInboxSelection && inboxSelectionCount === inboxCount;

  // 统一判断：当前是否有任何选择操作
  const activeSelection = showInboxListMode ? hasInboxSelection : hasSelection;

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center justify-between px-6 py-3 border-b"
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {showInboxListMode ? t("inboxes") : t("inbox")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {showInboxListMode
            ? hasInboxSelection
              ? t("selectedInboxCount", { count: inboxSelectionCount })
              : t("inboxes")
            : hasSelection
              ? t("selectedCount", { count: selectionCount })
              : t("emailsCount", { count: totalCount })}
        </p>
      </div>

      <AnimatePresence mode="popLayout">
        {showInboxListMode && hasInboxSelection ? (
          /* 收件箱选择操作栏 */
          <motion.div
            key="inbox-selection-actions"
            layout
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
            className="flex items-center gap-2"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSelectAllInboxes}
            >
              {isAllInboxesSelected ? (
                <motion.div
                  key="all-inboxes-selected"
                  layout
                  initial={{ rotate: -90, scale: 0.8, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <CheckSquare />
                </motion.div>
              ) : (
                <motion.div
                  key="partial-inboxes-selected"
                  layout
                  initial={{ rotate: 90, scale: 0.8, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Square />
                </motion.div>
              )}
            </Button>

            <DeleteDialog
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-destructive/10 hover:text-destructive"
                  onClick={(event) => event.stopPropagation()}
                >
                  <motion.div
                    whileHover={{ rotate: -12 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Trash2 />
                  </motion.div>
                </Button>
              }
              title={t("batchDeleteInboxConfirm")}
              description={t("batchDeleteInboxDesc", { count: inboxSelectionCount })}
              onConfirm={(event) => {
                event?.stopPropagation();
                onBatchDeleteInboxes?.();
              }}
              cancelText={t("cancel")}
              confirmText={t("delete")}
              allowUnsafeHtml
            />

            <Button variant="outline" onClick={onClearInboxSelection}>{t("cancel")}</Button>
          </motion.div>
        ) : hasSelection ? (
          /* 邮件选择操作栏 */
          <motion.div
            key="selection-actions"
            layout
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
            className="flex items-center gap-2"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSelectAll}
            >
              {isAllSelected ? (
                <motion.div
                  key="all-selected"
                  layout
                  initial={{ rotate: -90, scale: 0.8, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <CheckSquare />
                </motion.div>
              ) : (
                <motion.div
                  key="partial-selected"
                  layout
                  initial={{ rotate: 90, scale: 0.8, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Square />
                </motion.div>
              )}
            </Button>

            <DeleteDialog
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-destructive/10 hover:text-destructive"
                  onClick={(event) => event.stopPropagation()}
                >
                  <motion.div
                    whileHover={{ rotate: -12 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Trash2 />
                  </motion.div>
                </Button>
              }
              title={t("batchDeleteConfirm")}
              description={t("batchDeleteDesc", { count: selectionCount })}
              onConfirm={(event) => {
                event?.stopPropagation();
                onBatchDelete();
              }}
              cancelText={t("cancel")}
              confirmText={t("delete")}
              allowUnsafeHtml
            />

            <Button variant="outline" onClick={onClearSelection}>{t("cancel")}</Button>
          </motion.div>
        ) : (
          /* 默认操作栏 */
          <motion.div
            key="default-actions"
            layout
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
            className="flex items-center gap-2"
          >
            <Button variant="ghost" size="icon" onClick={onOpenSettings}>
              <motion.div
                layout
                whileHover={{ rotate: 20 }}
                whileTap={{ rotate: -20 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <SettingsIcon />
              </motion.div>
            </Button>
            <Button size="icon" onClick={onRefresh} disabled={loading} className="shadow-sm hover:shadow-md transition-all duration-200">
              <motion.div animate={{ rotate: loading ? 360 : 0 }} transition={{ repeat: loading ? Infinity : 0, duration: 0.8, ease: "linear" }}>
                <RefreshCw />
              </motion.div>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
