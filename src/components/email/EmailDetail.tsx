"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Mail, Languages, Loader2, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/lib/store/settings";
import EmailContent from "@/components/email/EmailContent";
import EmailAvatar from "@/components/email/EmailAvatar";
import EmailEditResult from "@/components/email/EmailEditResult";
import { useMarkEmail, useTranslateEmail } from "@/lib/hooks/useEmailApi";
import useTranslation from "@/lib/hooks/useTranslation";
import type { Email } from "@/types";

export default function EmailDetail({ email }: { email: Email | null }) {
  const { t } = useTranslation();
  const { editMode } = useSettingsStore();
  const { mutate: markEmail } = useMarkEmail();
  const translateMutation = useTranslateEmail();

  // 翻译状态：按 emailId 缓存翻译结果
  const [translatedCache, setTranslatedCache] = useState<Record<number, { html?: string; text?: string }>>({});
  const [showTranslated, setShowTranslated] = useState(false);

  useEffect(() => {
    if (!email || email.readStatus === 1) {
      return;
    }

    markEmail({ emailId: email.id, isRead: true });
  }, [email, markEmail]);

  // 切换邮件时重置翻译显示状态
  useEffect(() => {
    setShowTranslated(false);
  }, [email?.id]);

  const handleTranslate = useCallback(() => {
    if (!email) return;

    // 如果已翻译过，直接切换显示
    if (translatedCache[email.id]) {
      setShowTranslated((prev) => !prev);
      return;
    }

    // 发起翻译请求
    const content = email.bodyHtml || email.bodyText || '';
    if (!content) return;

    translateMutation.mutate(content, {
      onSuccess: (translated) => {
        setTranslatedCache((prev) => ({
          ...prev,
          [email.id]: email.bodyHtml ? { html: translated } : { text: translated },
        }));
        setShowTranslated(true);
      },
    });
  }, [email, translatedCache, translateMutation]);

  if (!email) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center justify-center h-full w-full"
      >
        <div className="flex flex-col items-center text-center p-8">
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4"
          >
            <Mail className="h-10 w-10 text-muted-foreground" />
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-lg font-semibold text-foreground mb-2"
          >
            {t("selectEmail")}
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="text-sm text-muted-foreground max-w-sm"
          >
            {t("selectEmailDesc")}
          </motion.p>
        </div>
      </motion.div>
    );
  }

  // 格式化完整时间
  const formatFullTime = (sentAt: string | null): string => {
    if (!sentAt) return '';
    const date = new Date(sentAt);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const cached = translatedCache[email.id];
  const isTranslating = translateMutation.isPending;
  const hasContent = !!(email.bodyHtml || email.bodyText);

  // 当前显示的内容
  const displayHtml = showTranslated && cached?.html ? cached.html : email.bodyHtml;
  const displayText = showTranslated && cached?.text ? cached.text : email.bodyText;

  return (
    <motion.div
      key={email.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col h-full"
    >
      {/* 标题栏：邮件主题 + 操作按钮 */}
      <div className="flex-shrink-0 bg-card border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="text-lg font-semibold text-foreground leading-relaxed flex-1 min-w-0"
            >
              {email.title || t("noSubject")}
            </motion.h2>

            {/* 翻译按钮 */}
            {hasContent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.25 }}
                className="flex-shrink-0"
              >
                <Button
                  variant={showTranslated ? "default" : "outline"}
                  size="sm"
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="rounded-lg gap-1.5"
                >
                  {isTranslating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : showTranslated ? (
                    <ArrowLeftRight className="h-4 w-4" />
                  ) : (
                    <Languages className="h-4 w-4" />
                  )}
                  <span className="text-xs">
                    {isTranslating
                      ? t("translating")
                      : showTranslated
                        ? t("showOriginal")
                        : t("translate")}
                  </span>
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* 发件人/收件人信息区 */}
      <div className="flex-shrink-0 bg-card">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="px-6 py-4"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <EmailAvatar
                name={email.fromName || ""}
                fromAddress={email.fromAddress}
              />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              {/* 发件人 */}
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground truncate">
                  {email.fromName}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {email.fromAddress}
                </span>
              </div>

              {/* 收件人 */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{t("to")}</span>
                <span className="text-xs text-foreground truncate">
                  {email.toAddress}
                </span>
              </div>

              {/* 时间 */}
              <div>
                <span className="text-xs text-muted-foreground">
                  {formatFullTime(email.sentAt)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 编辑模式 */}
        {editMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="px-6 pb-4"
          >
            <EmailEditResult email={email} />
          </motion.div>
        )}

        <Separator />
      </div>

      {/* 邮件正文 */}
      <ScrollArea className="flex-1 min-h-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.3 }}
        >
          {/* 翻译提示条 */}
          {showTranslated && cached && (
            <div className="px-6 py-2 bg-primary/5 border-b border-primary/10">
              <p className="text-xs text-primary">
                {t("translatedHint")}
              </p>
            </div>
          )}

          <EmailContent
            bodyHtml={displayHtml}
            bodyText={displayText}
          />
        </motion.div>
      </ScrollArea>
    </motion.div>
  );
}
