import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  coins: integer("coins").notNull().default(100),
  isAdmin: boolean("is_admin").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  verificationCode: text("verification_code"),
  lastCoinCollection: timestamp("last_coin_collection"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const deployments = pgTable("deployments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  repoUrl: text("repo_url").notNull(),
  status: text("status").notNull().default("pending"), // pending, deploying, active, failed, stopped
  renderServiceId: text("render_service_id"),
  sessionName: text("session_name"),
  pairingMode: text("pairing_mode").notNull().default("qr"), // qr, phone
  envVars: text("env_vars"), // JSON string
  nodeVersion: text("node_version").notNull().default("18"),
  autoDeploy: boolean("auto_deploy").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const coinTransfers = pgTable("coin_transfers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: uuid("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: uuid("to_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const usersRelations = relations(users, ({ many }) => ({
  deployments: many(deployments),
  sentTransfers: many(coinTransfers, { relationName: "sentTransfers" }),
  receivedTransfers: many(coinTransfers, { relationName: "receivedTransfers" }),
}));

export const deploymentsRelations = relations(deployments, ({ one }) => ({
  user: one(users, {
    fields: [deployments.userId],
    references: [users.id],
  }),
}));

export const coinTransfersRelations = relations(coinTransfers, ({ one }) => ({
  fromUser: one(users, {
    fields: [coinTransfers.fromUserId],
    references: [users.id],
    relationName: "sentTransfers",
  }),
  toUser: one(users, {
    fields: [coinTransfers.toUserId],
    references: [users.id],
    relationName: "receivedTransfers",
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  coins: true,
  isAdmin: true,
  isVerified: true,
  verificationCode: true,
  lastCoinCollection: true,
});

export const insertDeploymentSchema = createInsertSchema(deployments).omit({
  id: true,
  userId: true,
  status: true,
  renderServiceId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCoinTransferSchema = createInsertSchema(coinTransfers).omit({
  id: true,
  fromUserId: true,
  toUserId: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deployments.$inferSelect;
export type InsertCoinTransfer = z.infer<typeof insertCoinTransferSchema>;
export type CoinTransfer = typeof coinTransfers.$inferSelect;
