import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resumeAnalysesTable = pgTable("resume_analyses", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  atsScore: integer("ats_score").notNull(),
  extractedInfo: jsonb("extracted_info").notNull(),
  keywordGaps: jsonb("keyword_gaps").notNull(),
  improvementSuggestions: jsonb("improvement_suggestions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResumeAnalysisSchema = createInsertSchema(resumeAnalysesTable).omit({ id: true, createdAt: true });
export type InsertResumeAnalysis = z.infer<typeof insertResumeAnalysisSchema>;
export type ResumeAnalysis = typeof resumeAnalysesTable.$inferSelect;
