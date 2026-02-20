"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Languages, Loader2, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/lib/store/settings";
import { useDevice } from "@/provider/Device";
import EmailContent from "@/components/email/EmailContent";
import EmailAvatar from "@/components/email/EmailAvatar";
import EmailEditResult from "@/components/email/EmailEditResult";
import { useMarkEmail, useTranslateEmail } from "@/lib/hooks/useEmailApi";
import useTranslation from "@/lib/hooks/useTranslation";
import { cn } from "@/lib/utils/utils";
import type { Email } from "@/types";

export default function EmailDetail({ email }: { email: Email | null }) {
  const { t } = useTranslation();
  const { isMobile } = useDevice();
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
          {/* 叠放信封效果 */}
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-20 h-20 mb-6"
          >
            <div className="absolute inset-0 rounded-2xl bg-muted/30 transform rotate-6 translate-x-2 -translate-y-1" />
            <div className="absolute inset-0 rounded-2xl bg-muted/60 transform -rotate-3 translate-x-1" />
            <div className="absolute inset-0 rounded-2xl bg-muted flex items-center justify-center shadow-sm">
              <Mail className="h-9 w-9 text-muted-foreground/70" />
            </div>
          </motion.div>

          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="text-lg font-semibold text-foreground mb-2"
          >
            {t("selectEmail")}
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.3 }}
            className="text-sm text-muted-foreground max-w-[280px] leading-relaxed"
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
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col h-full"
    >
      {/* 标题区：纯净背景，突出主题 */}
      <div className="flex-shrink-0">
        <div className={cn(isMobile ? "px-4 py-3" : "px-6 py-5")}>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className={cn(
              "font-semibold text-foreground leading-tight",
              isMobile ? "text-base" : "text-xl"
            )}
          >
            {email.title || t("noSubject")}
          </motion.h2>
        </div>
      </div>

      {/* 信息区：微妙的层级差异 */}
      <div className="flex-shrink-0 bg-muted/30 dark:bg-card">
        <Separator />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className={cn(isMobile ? "px-4 py-3" : "px-6 py-4")}
        >
          <div className={cn("flex items-start", isMobile ? "gap-3" : "gap-4")}>
            <div className="flex-shrink-0 mt-0.5">
              <EmailAvatar
                name={email.fromName || ""}
                fromAddress={email.fromAddress}
              />
            </div>

            <div className="flex-1 min-w-0">
              {/* 第一行：发件人名 + 翻译按钮 */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground truncate">
                  {email.fromName}
                </span>

                {/* 翻译按钮 - 三态视觉 */}
                {hasContent && (
                  <Button
                    variant={
                      isTranslating ? "outline" :
                      showTranslated ? "secondary" :
                      "ghost"
                    }
                    size="sm"
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    aria-label={
                      isTranslating ? t("translating") :
                      showTranslated ? t("showOriginal") :
                      t("translate")
                    }
                    className={cn(
                      "rounded-lg gap-1.5 text-xs transition-all duration-200 flex-shrink-0",
                      !isTranslating && !showTranslated && "text-muted-foreground hover:text-foreground",
                      isTranslating && "border-primary/30 text-muted-foreground",
                      showTranslated && "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                    )}
                  >
                    {isTranslating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : showTranslated ? (
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                    ) : (
                      <Languages className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {isTranslating
                        ? t("translating")
                        : showTranslated
                          ? t("showOriginal")
                          : t("translate")}
                    </span>
                  </Button>
                )}
              </div>

              {/* 第二行：邮箱地址 */}
              <div className="mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {email.fromAddress}
                </span>
              </div>

              {/* 第三行：收件人 + 时间（圆点分隔） */}
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground flex-wrap">
                <span>{t("to")}</span>
                <span className="text-foreground/70 truncate max-w-[200px]">
                  {email.toAddress}
                </span>
                {email.sentAt && (
                  <>
                    <span className="text-border">·</span>
                    <span className="flex-shrink-0">
                      {formatFullTime(email.sentAt)}
                    </span>
                  </>
                )}
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
            className={cn(isMobile ? "px-4 pb-3" : "px-6 pb-4")}
          >
            <EmailEditResult email={email} />
          </motion.div>
        )}
      </div>

      {/* 内缩分隔线 */}
      <Separator className={cn(isMobile ? "mx-4" : "mx-6")} />

      {/* 正文区 */}
      <ScrollArea className="flex-1 min-h-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.3 }}
        >
          {/* 翻译提示条 */}
          <AnimatePresence>
            {showTranslated && cached && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "px-4 py-2.5 bg-primary/5 rounded-lg border-l-2 border-primary/40 overflow-hidden",
                  isMobile ? "mx-4" : "mx-6"
                )}
                role="status"
                aria-live="polite"
              >
                <p className="text-xs text-primary/80">
                  {t("translatedHint")}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 正文内容容器 */}
          <div className={cn(isMobile ? "px-4 py-4" : "px-6 py-5")}>
            <EmailContent
              bodyHtml={displayHtml}
              bodyText={displayText}
            />
          </div>
        </motion.div>
      </ScrollArea>
    </motion.div>
  );
}
