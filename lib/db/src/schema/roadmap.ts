import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roadmapsTable = pgTable("roadmaps", {
  id: serial("id").primaryKey(),
  targetRole: text("target_role").notNull(),
  overview: text("overview").notNull(),
  skills: jsonb("skills").notNull(),
  certifications: jsonb("certifications").notNull(),
  projects: jsonb("projects").notNull(),
  milestones: jsonb("milestones").notNull(),
  timelineSummary: text("timeline_summary").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRoadmapSchema = createInsertSchema(roadmapsTable).omit({ id: true, createdAt: true });
export type InsertRoadmap = z.infer<typeof insertRoadmapSchema>;
export type Roadmap = typeof roadmapsTable.$inferSelect;
