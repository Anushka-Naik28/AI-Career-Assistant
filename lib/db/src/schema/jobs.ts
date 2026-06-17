import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobMatchesTable = pgTable("job_matches", {
  id: serial("id").primaryKey(),
  jobTitle: text("job_title").notNull().default("Untitled Role"),
  jobDescription: text("job_description").notNull(),
  matchPercentage: integer("match_percentage").notNull(),
  skillGaps: jsonb("skill_gaps").notNull(),
  improvementSuggestions: text("improvement_suggestions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobMatchSchema = createInsertSchema(jobMatchesTable).omit({ id: true, createdAt: true });
export type InsertJobMatch = z.infer<typeof insertJobMatchSchema>;
export type JobMatch = typeof jobMatchesTable.$inferSelect;
