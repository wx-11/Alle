"use client";

import { motion } from "framer-motion";
import { Mail, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import useTranslation from "@/lib/hooks/useTranslation";
import type { Inbox } from "@/types";

interface InboxListProps {
  inboxes: Inbox[];
  loading: boolean;
  onSelectInbox: (address: string) => void;
}

export default function InboxList({ inboxes, loading, onSelectInbox }: InboxListProps) {
  const { t } = useTranslation();

  if (loading && inboxes.length === 0) {
    return (
      <div className="divide-y divide-border">
        {[1, 2, 3].map((item) => (
          <div key={item} className="px-6 py-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (inboxes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Mail className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{t("noEmails")}</h3>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
      <div className="divide-y divide-border">
        {inboxes.map((inbox, index) => (
          <motion.div
            key={inbox.address}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.5), duration: 0.25 }}
          >
            <div
              className="flex items-center gap-4 px-6 py-4 cursor-pointer transition-all duration-200 hover:bg-accent group"
              onClick={() => onSelectInbox(inbox.address)}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-foreground truncate">
                    {inbox.address}
                  </h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {inbox.unread > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                        {inbox.unread}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("emailsCount", { count: inbox.total })}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

interface InboxHeaderProps {
  selectedInbox: string;
  onBack: () => void;
}

export function InboxBackHeader({ selectedInbox, onBack }: InboxHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/50">
      <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{selectedInbox}</p>
      </div>
    </div>
  );
}
