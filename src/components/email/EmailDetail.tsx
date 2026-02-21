"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Languages, Loader2, ArrowLeftRight, Copy, Check, Code } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  const [showRawSource, setShowRawSource] = useState(false);

  useEffect(() => {
    if (!email || email.readStatus === 1) {
      return;
    }
    markEmail({ emailId: email.id, isRead: true });
  }, [email, markEmail]);

  // 切换邮件时重置所有状态
  useEffect(() => {
    setShowTranslated(false);
    setShowRawSource(false);
    setCopied(false);
  }, [email?.id]);

  const handleTranslate = useCallback(() => {
    if (!email) return;

    if (translatedCache[email.id]) {
      setShowTranslated((prev) => !prev);
      return;
    }

    const content = email.bodyText || '';
    if (!content && !email.bodyHtml) return;

    // bodyText 用于语言检测，bodyHtml 用于 HTML 翻译
    const contentHtml = email.bodyHtml || undefined;

    translateMutation.mutate({ content, contentHtml }, {
      onSuccess: (result) => {
        setTranslatedCache((prev) => ({
          ...prev,
          [email.id]: { text: result.text ?? undefined, html: result.html ?? undefined },
        }));
        setShowTranslated(true);
      },
    });
  }, [email, translatedCache, translateMutation]);

  const handleCopyFullText = useCallback(() => {
    if (!email) return;

    let text: string;
    if (showRawSource) {
      // 源信息视图：复制结构化原始信息
      const fields = [
        `Message-ID: ${email.messageId || ''}`,
        `From: ${email.fromName ? `${email.fromName} <${email.fromAddress}>` : email.fromAddress || ''}`,
        `To: ${email.toAddress || ''}`,
        `Subject: ${email.title || ''}`,
        `Sent-At: ${email.sentAt || ''}`,
        `Received-At: ${email.receivedAt || ''}`,
        `Email-Type: ${email.emailType || ''}`,
        `Email-Result: ${email.emailResult || ''}`,
        '',
        email.bodyText || '',
      ];
      text = fields.join('\n');
    } else {
      text = email.bodyText || email.bodyHtml || '';
    }
    if (!text) return;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [email, showRawSource]);

  const handleToggleRawSource = useCallback(() => {
    setShowRawSource((prev) => !prev);
  }, []);

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

  // 翻译模式：优先使用 HTML 翻译结果保留格式，fallback 到纯文本
  const isTranslatedView = showTranslated && cached;
  const hasTranslatedHtml = isTranslatedView && !!cached?.html;

  return (
    <motion.div
      key={email.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col h-full"
    >
      {/* 标题区 */}
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

      {/* 信息区 */}
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
              {/* 发件人名 */}
              <span className="text-sm font-semibold text-foreground truncate block">
                {email.fromName}
              </span>

              {/* 邮箱地址 */}
              <div className="mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {email.fromAddress}
                </span>
              </div>

              {/* 收件人 */}
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <span>{t("to")}</span>
                <span className="text-foreground/70 truncate max-w-[200px]">
                  {email.toAddress}
                </span>
              </div>

              {/* 时间 */}
              {email.sentAt && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatFullTime(email.sentAt)}
                </div>
              )}

              {/* 操作按钮栏 */}
              {hasContent && (
                <div className="flex items-center gap-1.5 mt-3">
                  {/* 翻译按钮 */}
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
                      "rounded-lg gap-1.5 text-xs transition-all duration-200 h-7 px-2.5",
                      !isTranslating && !showTranslated && "text-muted-foreground hover:text-foreground",
                      isTranslating && "border-primary/30 text-muted-foreground cursor-wait",
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

                  {/* 复制全文按钮 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyFullText}
                    aria-label={copied ? t("copied") : t("copyFullText")}
                    className="rounded-lg gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all duration-200 h-7 px-2.5"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {copied ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <span>{copied ? t("copied") : t("copyFullText")}</span>
                  </Button>

                  {/* 查看原文按钮 */}
                  <Button
                    variant={showRawSource ? "secondary" : "ghost"}
                    size="sm"
                    onClick={handleToggleRawSource}
                    aria-label={showRawSource ? t("hideRawSource") : t("viewRawSource")}
                    className={cn(
                      "rounded-lg gap-1.5 text-xs transition-all duration-200 h-7 px-2.5",
                      showRawSource
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Code className="h-3.5 w-3.5" />
                    <span>{showRawSource ? t("hideRawSource") : t("viewRawSource")}</span>
                  </Button>
                </div>
              )}
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
            {showTranslated && cached && !showRawSource && (
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

          {/* 正文内容 */}
          <div className={cn(isMobile ? "px-4 py-4" : "px-6 py-5")}>
            {showRawSource ? (
              // 原始邮件信息
              <div className="space-y-4">
                <RawField label="Message-ID" value={email.messageId} />
                <RawField label="From" value={email.fromName ? `${email.fromName} <${email.fromAddress}>` : email.fromAddress} />
                <RawField label="To" value={email.toAddress} />
                <RawField label="Recipient" value={email.recipient} />
                <RawField label="Subject" value={email.title} />
                <RawField label="Sent-At" value={email.sentAt} />
                <RawField label="Received-At" value={email.receivedAt} />
                <RawField label="Email-Type" value={email.emailType} />
                <RawField label="Email-Result" value={email.emailResult} />
                <RawField label="Email-Result-Text" value={email.emailResultText} />
                {email.emailError && <RawField label="Email-Error" value={email.emailError} />}
                <Separator />
                <RawBlock label="Body-Text" text={email.bodyText || ""} maxHeight="max-h-[300px]" />
                {email.bodyHtml && (
                  <RawBlock label="Body-HTML" text={email.bodyHtml} maxHeight="max-h-[400px]" />
                )}
              </div>
            ) : isTranslatedView ? (
              hasTranslatedHtml ? (
                // 翻译模式 + HTML 翻译可用：保留原始格式渲染
                <EmailContent
                  bodyHtml={cached.html ?? null}
                  bodyText={cached.text ?? null}
                />
              ) : (
                // 翻译模式 + 仅纯文本：纯文本展示
                <p className="text-[15px] text-foreground whitespace-pre-wrap leading-7 max-w-[65ch]">
                  {cached?.text}
                </p>
              )
            ) : (
              <EmailContent
                bodyHtml={email.bodyHtml}
                bodyText={email.bodyText}
              />
            )}
          </div>
        </motion.div>
      </ScrollArea>
    </motion.div>
  );
}

/** 原始字段展示组件 */
function RawField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-xs font-mono text-muted-foreground flex-shrink-0 w-32 text-right">{label}</span>
      <span className="text-xs font-mono text-foreground break-all">{value}</span>
    </div>
  );
}

/** Body-Text / Body-HTML 块：自动检测滚动条，智能调整复制按钮位置 */
function RawBlock({ label, text, maxHeight }: { label: string; text: string; maxHeight: string }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [hasScrollbar, setHasScrollbar] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = preRef.current;
    if (!el) return;
    const check = () => setHasScrollbar(el.scrollHeight > el.clientHeight);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  const handleCopy = useCallback(() => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <div className="relative">
      <span className="text-xs font-mono text-muted-foreground block mb-2">{label}</span>
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          "absolute top-6 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer",
          hasScrollbar ? "right-6" : "right-2"
        )}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-chart-2" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre
        ref={preRef}
        className={cn(
          "text-xs font-mono text-foreground bg-muted/50 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all overflow-y-auto",
          maxHeight
        )}
      >
        {text || "(empty)"}
      </pre>
    </div>
  );
}
