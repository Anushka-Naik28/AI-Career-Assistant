import { Router } from "express";
import { db, resumeAnalysesTable, jobMatchesTable, roadmapsTable, interviewSessionsTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";

const router = Router();

router.get("/analytics/dashboard", async (_req, res): Promise<void> => {
  const [resumeStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      avg: sql<number>`round(avg(ats_score))::int`,
    })
    .from(resumeAnalysesTable);

  const [jobStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      avg: sql<number>`round(avg(match_percentage))::int`,
    })
    .from(jobMatchesTable);

  const [interviewStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      avg: sql<number>`round(avg(overall_score))::int`,
    })
    .from(interviewSessionsTable);

  const [roadmapStats] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(roadmapsTable);

  // Career readiness: weighted average of all available scores
  const scores: number[] = [];
  if (resumeStats?.avg) scores.push(resumeStats.avg);
  if (jobStats?.avg) scores.push(jobStats.avg);
  if (interviewStats?.avg) scores.push(interviewStats.avg);
  const careerReadinessScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  // Recent activity: combine last events from each table
  const recentResumes = await db
    .select({ id: resumeAnalysesTable.id, filename: resumeAnalysesTable.filename, createdAt: resumeAnalysesTable.createdAt })
    .from(resumeAnalysesTable)
    .orderBy(desc(resumeAnalysesTable.createdAt))
    .limit(3);

  const recentJobs = await db
    .select({ id: jobMatchesTable.id, jobTitle: jobMatchesTable.jobTitle, createdAt: jobMatchesTable.createdAt })
    .from(jobMatchesTable)
    .orderBy(desc(jobMatchesTable.createdAt))
    .limit(3);

  const recentInterviews = await db
    .select({ id: interviewSessionsTable.id, role: interviewSessionsTable.role, createdAt: interviewSessionsTable.createdAt })
    .from(interviewSessionsTable)
    .orderBy(desc(interviewSessionsTable.createdAt))
    .limit(3);

  const recentActivity = [
    ...recentResumes.map((r) => ({
      type: "resume",
      description: `Resume analyzed: ${r.filename}`,
      createdAt: r.createdAt.toISOString(),
    })),
    ...recentJobs.map((j) => ({
      type: "job",
      description: `Job match: ${j.jobTitle}`,
      createdAt: j.createdAt.toISOString(),
    })),
    ...recentInterviews.map((i) => ({
      type: "interview",
      description: `Mock interview: ${i.role}`,
      createdAt: i.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  res.json({
    totalResumesAnalyzed: resumeStats?.total ?? 0,
    avgAtsScore: resumeStats?.avg ?? null,
    totalJobMatches: jobStats?.total ?? 0,
    avgMatchScore: jobStats?.avg ?? null,
    totalInterviews: interviewStats?.total ?? 0,
    avgInterviewScore: interviewStats?.avg ?? null,
    totalRoadmaps: roadmapStats?.total ?? 0,
    careerReadinessScore,
    recentActivity,
  });
});

router.get("/analytics/ats-trend", async (_req, res): Promise<void> => {
  const records = await db
    .select({
      filename: resumeAnalysesTable.filename,
      atsScore: resumeAnalysesTable.atsScore,
      createdAt: resumeAnalysesTable.createdAt,
    })
    .from(resumeAnalysesTable)
    .orderBy(resumeAnalysesTable.createdAt)
    .limit(20);

  res.json(
    records.map((r) => ({
      date: r.createdAt.toISOString().split("T")[0],
      score: r.atsScore,
      filename: r.filename,
    }))
  );
});

export default router;
