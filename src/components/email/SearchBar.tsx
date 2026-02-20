"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useTranslation from "@/lib/hooks/useTranslation";

interface SearchBarProps {
  onSearch: (keyword: string, isRegex: boolean) => void;
  initialSearch?: string;
  initialRegex?: boolean;
}

export default function SearchBar({ onSearch, initialSearch = "", initialRegex = false }: SearchBarProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(initialSearch);
  const [isRegex, setIsRegex] = useState(initialRegex);
  const [regexError, setRegexError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 同步外部初始值变更
  useEffect(() => {
    setInputValue(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setIsRegex(initialRegex);
  }, [initialRegex]);

  const validateRegex = useCallback((value: string, regex: boolean): boolean => {
    if (!regex || !value) return true;
    try {
      new RegExp(value);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      if (isRegex && value) {
        setRegexError(!validateRegex(value, true));
      } else {
        setRegexError(false);
      }
    },
    [isRegex, validateRegex],
  );

  const handleToggleRegex = useCallback(() => {
    const next = !isRegex;
    setIsRegex(next);
    if (next && inputValue) {
      setRegexError(!validateRegex(inputValue, true));
    } else {
      setRegexError(false);
    }
  }, [isRegex, inputValue, validateRegex]);

  const handleSubmit = useCallback(() => {
    if (regexError) return;
    onSearch(inputValue.trim(), isRegex);
  }, [inputValue, isRegex, regexError, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    setRegexError(false);
    onSearch("", isRegex);
    inputRef.current?.focus();
  }, [isRegex, onSearch]);

  const hasInput = inputValue.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="px-4 py-2 border-b border-border bg-card/50"
    >
      <div className="flex items-center gap-2">
        {/* 正则 toggle */}
        <button
          type="button"
          onClick={handleToggleRegex}
          className={`h-8 px-2 text-xs font-mono flex-shrink-0 rounded-md transition-colors ${
            isRegex ? "text-primary" : "text-muted-foreground"
          }`}
          title={t("regexMode")}
        >
          .*
        </button>

        {/* 搜索输入框 */}
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t("searchPlaceholder")}
            className={`h-8 pr-8 text-sm ${regexError ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/50" : ""}`}
            aria-invalid={regexError}
          />
          {/* 清除按钮 */}
          {hasInput && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* 搜索按钮 */}
        <Button
          variant="default"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={handleSubmit}
          disabled={regexError}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* 正则错误提示 */}
      {regexError && (
        <p className="text-xs text-destructive mt-1 pl-1">{t("invalidRegex")}</p>
      )}
    </motion.div>
  );
}
