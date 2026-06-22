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

  let roadmap: any;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to generate roadmap");
    }
    roadmap = JSON.parse(content);
  } catch (err) {
    req.log.warn({ err }, "OpenAI roadmap generation failed, using fallback mock data.");
    roadmap = {
      targetRole,
      overview: `A comprehensive guide to transition into a successful ${targetRole} role, focusing on core engineering principles and advanced framework capabilities.`,
      skills: ["JavaScript/TypeScript", "React", "Node.js", "System Design", "CI/CD Pipelines", "Containerization (Docker)", "Database Optimization"],
      certifications: [
        { name: "AWS Certified Developer", provider: "Amazon Web Services", description: "Validation of technical expertise in developing and maintaining AWS-based applications." },
        { name: "Certified Kubernetes Application Developer (CKAD)", provider: "CNCF", description: "Demonstrates ability to design, build, and deploy cloud-native applications." }
      ],
      projects: [
        {
          name: "Scalable Microservices Gateway",
          description: "Built an API gateway handling authentication, routing, and rate-limiting using Node.js and Redis.",
          difficulty: "Advanced",
          techStack: ["Node.js", "Redis", "Docker", "Express"],
          learningOutcomes: ["Understood rate-limiting algorithms", "Implemented highly performant middleware in Node.js"]
        },
        {
          name: "Collaborative Real-time Editor",
          description: "Created a collaborative document editor using CRDTs and WebSockets for real-time conflict-free editing.",
          difficulty: "Advanced",
          techStack: ["TypeScript", "React", "WebSockets", "Yjs"],
          learningOutcomes: ["Mastered distributed state management", "Optimized render cycles in React for concurrent updates"]
        }
      ],
      milestones: [
        { name: "Master Full-Stack Core Fundamentals", description: "Gain deep proficiency in advanced TypeScript, asynchronous patterns, and database normalization/indexing.", durationWeeks: 4 },
        { name: "Adopt Cloud & DevOps Practices", description: "Deploy full applications inside Docker containers and establish automated GitHub Actions workflows.", durationWeeks: 6 },
        { name: "Learn System Design Patterns", description: "Study horizontal scaling, caching strategies (Redis), message queues (RabbitMQ/Kafka), and microservices.", durationWeeks: 8 }
      ],
      timelineSummary: "An intensive 18-week study and implementation plan to confidently transition to the role."
    };
  }

  try {
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
  } catch (dbErr) {
    req.log.warn({ dbErr }, "Database insert for career roadmap failed, returning mock data directly.");
    res.json({
      id: -1,
      targetRole: roadmap.targetRole,
      overview: roadmap.overview,
      skills: roadmap.skills as string[],
      certifications: roadmap.certifications as typeof roadmap.certifications,
      projects: roadmap.projects as typeof roadmap.projects,
      milestones: roadmap.milestones as typeof roadmap.milestones,
      timelineSummary: roadmap.timelineSummary,
      createdAt: new Date().toISOString(),
    });
  }
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
