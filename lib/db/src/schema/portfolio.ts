import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const portfolioContentTable = pgTable("portfolio_content", {
  id: serial("id").primaryKey(),
  targetRole: text("target_role").notNull(),
  linkedInSummary: text("linkedin_summary").notNull(),
  linkedInHeadline: text("linkedin_headline").notNull(),
  professionalBio: text("professional_bio").notNull(),
  projectDescriptions: jsonb("project_descriptions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPortfolioContentSchema = createInsertSchema(portfolioContentTable).omit({ id: true, createdAt: true });
export type InsertPortfolioContent = z.infer<typeof insertPortfolioContentSchema>;
export type PortfolioContent = typeof portfolioContentTable.$inferSelect;
