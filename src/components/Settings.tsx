"use client";

import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/lib/store/settings";
import { Settings as SettingsIcon, LogOut, Trash2, ShieldOff } from "lucide-react";
import { useTheme } from "next-themes";
import useAuthStore from "@/lib/store/auth";
import useTranslation from "@/lib/hooks/useTranslation";
import DeleteDialog from "@/components/common/DeleteDialog";
import { revokeAllTokens } from "@/lib/api/auth";

export default function Settings() {
  const { t } = useTranslation();
  const { setTheme } = useTheme();
  const { logout } = useAuthStore();
  const {
    theme: storedTheme,
    language: storedLanguage,
    editMode,
    groupByInbox,
    setLanguage,
    setTheme: setStoredTheme,
    setEditMode,
    setGroupByInbox,
  } = useSettingsStore();

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setStoredTheme(newTheme);
  };

  const handleClearCache = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => registration.unregister())
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col h-full bg-background"
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <SettingsIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{t('settingsTitle')}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{t('settingsDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Appearance Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{t('appearance')}</h3>
                <p className="text-sm text-muted-foreground">{t('appearanceDesc')}</p>
              </div>

              <Separator />

              {/* Theme */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('theme')}</Label>
                <div className="grid grid-cols-3 gap-3">
                  {['light', 'dark', 'system'].map((themeOption) => (
                    <Button
                      key={themeOption}
                      variant={storedTheme === themeOption ? 'default' : 'outline'}
                      onClick={() => handleThemeChange(themeOption as 'light' | 'dark' | 'system')}
                      className="rounded-xl"
                    >
                      {t(themeOption)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('language')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={storedLanguage === 'zh' ? 'default' : 'outline'}
                    onClick={() => setLanguage('zh')}
                    className="rounded-xl"
                  >
                    中文
                  </Button>
                  <Button
                    variant={storedLanguage === 'en' ? 'default' : 'outline'}
                    onClick={() => setLanguage('en')}
                    className="rounded-xl"
                  >
                    English
                  </Button>
                </div>
              </div>
            </div>

            {/* General Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{t('general')}</h3>
                <p className="text-sm text-muted-foreground">{t('generalDesc')}</p>
              </div>

              <Separator />

              {/* Edit Mode */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('editMode')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={editMode ? 'default' : 'outline'}
                    onClick={() => setEditMode(true)}
                    className="rounded-xl"
                  >
                    {t('enabled')}
                  </Button>
                  <Button
                    variant={!editMode ? 'default' : 'outline'}
                    onClick={() => setEditMode(false)}
                    className="rounded-xl"
                  >
                    {t('disabled')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('editModeDesc')}
                </p>
              </div>

              {/* Group By Inbox */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('groupByInbox')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={groupByInbox ? 'default' : 'outline'}
                    onClick={() => setGroupByInbox(true)}
                    className="rounded-xl"
                  >
                    {t('enabled')}
                  </Button>
                  <Button
                    variant={!groupByInbox ? 'default' : 'outline'}
                    onClick={() => setGroupByInbox(false)}
                    className="rounded-xl"
                  >
                    {t('disabled')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('groupByInboxDesc')}
                </p>
              </div>


            </div>

            {/* Account Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{t('account')}</h3>
                <p className="text-sm text-muted-foreground">{t('accountDesc')}</p>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-3">
                <DeleteDialog
                  trigger={
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 h-auto py-2.5 px-2 text-xs"
                    >
                      <ShieldOff className="h-4 w-4 mr-1.5 flex-shrink-0" />
                      <span className="truncate">{t('revokeAllTokens')}</span>
                    </Button>
                  }
                  title={t('revokeAllTokensTitle')}
                  description={t('revokeAllTokensConfirm')}
                  onConfirm={async () => {
                    try {
                      await revokeAllTokens();
                      logout();
                    } catch {
                      // 401 时 apiFetch 已自动登出
                    }
                  }}
                  cancelText={t('cancel')}
                  confirmText={t('confirm')}
                />

                <DeleteDialog
                  trigger={
                    <Button
                      variant="destructive"
                      className="w-full rounded-xl h-auto py-2.5 px-2 text-xs"
                    >
                      <LogOut className="h-4 w-4 mr-1.5 flex-shrink-0" />
                      <span className="truncate">{t('logout')}</span>
                    </Button>
                  }
                  title={t('logoutTitle')}
                  description={t('logoutConfirm')}
                  onConfirm={logout}
                  cancelText={t('cancel')}
                  confirmText={t('confirm')}
                />

                <DeleteDialog
                  trigger={
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 h-auto py-2.5 px-2 text-xs"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5 flex-shrink-0" />
                      <span className="truncate">{t('clearCache')}</span>
                    </Button>
                  }
                  title={t('clearCacheTitle')}
                  description={t('clearCacheConfirmText')}
                  onConfirm={handleClearCache}
                  cancelText={t('cancel')}
                  confirmText={t('confirm')}
                />
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
}
