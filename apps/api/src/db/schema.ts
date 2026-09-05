import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const incidents = sqliteTable('incidents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  severity: text('severity', { enum: ['low', 'medium', 'high', 'critical'] })
    .notNull()
    .default('medium'),
  status: text('status', { enum: ['open', 'investigating', 'resolved'] })
    .notNull()
    .default('open'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});
