import { pgTable, serial, text, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const interviewSessionsTable = pgTable("interview_sessions", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  experienceLevel: text("experience_level").notNull(),
  firstQuestion: text("first_question").notNull(),
  overallScore: integer("overall_score"),
  questionsAnswered: integer("questions_answered").notNull().default(0),
  isComplete: boolean("is_complete").notNull().default(false),
  turns: jsonb("turns").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInterviewSessionSchema = createInsertSchema(interviewSessionsTable).omit({ id: true, createdAt: true });
export type InsertInterviewSession = z.infer<typeof insertInterviewSessionSchema>;
export type InterviewSession = typeof interviewSessionsTable.$inferSelect;
