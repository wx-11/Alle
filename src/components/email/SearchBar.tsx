"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
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
    <div
      className="px-4 py-2 border-b border-border bg-card/50"
      style={{ touchAction: "manipulation" }}
    >
      <div className="flex items-center gap-1.5">
        {/* 正则 toggle */}
        <button
          type="button"
          onClick={handleToggleRegex}
          className={`min-w-[36px] min-h-[36px] flex items-center justify-center text-xs font-mono flex-shrink-0 rounded-md transition-colors cursor-pointer select-none ${
            isRegex
              ? "bg-foreground text-background"
              : "text-muted-foreground"
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
            className={`h-9 pr-8 text-sm ${regexError ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/50" : ""}`}
            aria-invalid={regexError}
          />
          {/* 清除按钮 */}
          {hasInput && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* 搜索按钮 */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={regexError}
          className="min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0 rounded-md bg-primary text-primary-foreground hover:bg-primary-hover transition-all cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* 正则错误提示 */}
      {regexError && (
        <p className="text-xs text-destructive mt-1 pl-1">{t("invalidRegex")}</p>
      )}
    </div>
  );
}
