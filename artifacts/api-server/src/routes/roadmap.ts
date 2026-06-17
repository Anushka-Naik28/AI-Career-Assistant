import { Router } from "express";
import { db, roadmapsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { openai } from "../lib/openai";
import { GenerateRoadmapBody } from "@workspace/api-zod";

const router = Router();

router.post("/roadmap/generate", async (req, res): Promise<void> => {
  const parsed = GenerateRoadmapBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { targetRole } = parsed.data;

  const prompt = `You are an expert career counselor. Generate a personalized career roadmap for someone targeting the role: "${targetRole}".

Return a JSON object with EXACTLY this structure:
{
  "targetRole": "${targetRole}",
  "overview": "<2-3 sentence overview of the roadmap>",
  "skills": ["<skill1>", "<skill2>", ...],
  "certifications": [
    { "name": "<cert name>", "provider": "<provider>", "description": "<brief description>" },
    ...
  ],
  "projects": [
    {
      "name": "<project name>",
      "description": "<detailed description>",
      "difficulty": "Beginner" | "Intermediate" | "Advanced",
      "techStack": ["<tech1>", ...],
      "learningOutcomes": ["<outcome1>", ...]
    },
    ...
  ],
  "milestones": [
    { "name": "<milestone name>", "description": "<what to achieve>", "durationWeeks": <number> },
    ...
  ],
  "timelineSummary": "<overall timeline description>"
}

Provide realistic, current, and actionable recommendations. Include 5-8 skills, 3-4 certifications, 4-5 projects, and 4-6 milestones.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    res.status(500).json({ error: "Failed to generate roadmap" });
    return;
  }

  let roadmap: {
    targetRole: string;
    overview: string;
    skills: string[];
    certifications: Array<{ name: string; provider: string; description: string }>;
    projects: Array<{
      name: string;
      description: string;
      difficulty: string;
      techStack: string[];
      learningOutcomes: string[];
    }>;
    milestones: Array<{ name: string; description: string; durationWeeks: number }>;
    timelineSummary: string;
  };

  try {
    roadmap = JSON.parse(content);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const [record] = await db
    .insert(roadmapsTable)
    .values({
      targetRole: roadmap.targetRole,
      overview: roadmap.overview,
      skills: roadmap.skills,
      certifications: roadmap.certifications,
      projects: roadmap.projects,
      milestones: roadmap.milestones,
      timelineSummary: roadmap.timelineSummary,
    })
    .returning();

  res.json({
    id: record.id,
    targetRole: record.targetRole,
    overview: record.overview,
    skills: record.skills as string[],
    certifications: record.certifications as typeof roadmap.certifications,
    projects: record.projects as typeof roadmap.projects,
    milestones: record.milestones as typeof roadmap.milestones,
    timelineSummary: record.timelineSummary,
    createdAt: record.createdAt.toISOString(),
  });
});

router.get("/roadmap/history", async (_req, res): Promise<void> => {
  const records = await db
    .select({
      id: roadmapsTable.id,
      targetRole: roadmapsTable.targetRole,
      createdAt: roadmapsTable.createdAt,
    })
    .from(roadmapsTable)
    .orderBy(desc(roadmapsTable.createdAt))
    .limit(20);

  res.json(
    records.map((r) => ({
      id: r.id,
      targetRole: r.targetRole,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

export default router;
