import { getDb } from './common';
import { sql } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

const settingsDB = {
  async get(key: string): Promise<string | null> {
    const db = getDb();
    const rows = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(sql`${systemSettings.key} = ${key}`)
      .limit(1);
    return rows[0]?.value ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    const db = getDb();
    await db
      .insert(systemSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value },
      });
  },
};

export default settingsDB;
