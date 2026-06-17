import { Router } from "express";
import { db, jobMatchesTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { openai } from "../lib/openai";
import { MatchJobBody } from "@workspace/api-zod";

const router = Router();

router.post("/jobs/match", async (req, res): Promise<void> => {
  const parsed = MatchJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { jobDescription, resumeDataUri, jobTitle } = parsed.data;

  const prompt = `You are an expert career advisor specializing in resume-to-job matching.

Job Description:
${jobDescription}

The resume is provided as a base64 data URI (abbreviated): ${resumeDataUri.substring(0, 80)}...

Analyze the match and return a JSON object with EXACTLY this structure:
{
  "matchPercentage": <number 0-100>,
  "skillGaps": [<strings - specific skills from JD missing in resume>],
  "improvementSuggestions": "<detailed paragraph of actionable advice to better match this job>"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    res.status(500).json({ error: "Failed to analyze job match" });
    return;
  }

  let result: {
    matchPercentage: number;
    skillGaps: string[];
    improvementSuggestions: string;
  };

  try {
    result = JSON.parse(content);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const derivedTitle = jobTitle || extractJobTitle(jobDescription);

  const [record] = await db
    .insert(jobMatchesTable)
    .values({
      jobTitle: derivedTitle,
      jobDescription,
      matchPercentage: result.matchPercentage,
      skillGaps: result.skillGaps,
      improvementSuggestions: result.improvementSuggestions,
    })
    .returning();

  res.json({
    id: record.id,
    matchPercentage: record.matchPercentage,
    skillGaps: record.skillGaps,
    improvementSuggestions: record.improvementSuggestions,
    jobTitle: record.jobTitle,
    createdAt: record.createdAt.toISOString(),
  });
});

router.get("/jobs/history", async (_req, res): Promise<void> => {
  const records = await db
    .select({
      id: jobMatchesTable.id,
      jobTitle: jobMatchesTable.jobTitle,
      matchPercentage: jobMatchesTable.matchPercentage,
      createdAt: jobMatchesTable.createdAt,
    })
    .from(jobMatchesTable)
    .orderBy(desc(jobMatchesTable.createdAt))
    .limit(20);

  res.json(
    records.map((r) => ({
      id: r.id,
      jobTitle: r.jobTitle,
      matchPercentage: r.matchPercentage,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

function extractJobTitle(jd: string): string {
  const firstLine = jd.split("\n")[0]?.trim();
  if (firstLine && firstLine.length < 80) return firstLine;
  return "Job Position";
}

export default router;
