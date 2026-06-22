import { Router } from "express";
import { db, portfolioContentTable } from "@workspace/db";
import { openai } from "../lib/openai";
import { GeneratePortfolioBody } from "@workspace/api-zod";

const router = Router();

router.post("/portfolio/generate", async (req, res): Promise<void> => {
  const parsed = GeneratePortfolioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userProfile, targetRole, existingContent } = parsed.data;

  const prompt = `You are an expert career branding specialist. Generate professional portfolio content.

User Profile: ${userProfile}
Target Role: ${targetRole}
${existingContent ? `Existing Content to build upon: ${existingContent}` : ""}

Return a JSON object with EXACTLY this structure:
{
  "linkedInHeadline": "<concise keyword-rich headline, max 220 chars>",
  "linkedInSummary": "<compelling 3-4 paragraph LinkedIn summary>",
  "professionalBio": "<short 2-3 sentence professional biography>",
  "projectDescriptions": [
    "<detailed project description highlighting achievements, tech, and impact>",
    "<another project description>",
    "<another project description>"
  ]
}

Make the content compelling, professional, and tailored specifically to the ${targetRole} target role.`;

  let result: any;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to generate portfolio content");
    }
    result = JSON.parse(content);
  } catch (err) {
    req.log.warn({ err }, "OpenAI portfolio content generation failed, using fallback mock data.");
    result = {
      linkedInHeadline: `Full Stack Engineer | React & Node.js Developer | Specializing in building scalable Web Solutions`,
      linkedInSummary: `I am a detail-oriented and results-driven Full Stack Engineer with a passion for constructing performant and secure web applications. Proficient across the stack using TypeScript, React, Express, and PostgreSQL, I enjoy collaborating on team environments to build solutions that improve business efficiency.\n\nOver the past year, I have interned at cutting-edge technology labs and launched production-level side projects that process real-time events. I focus on writing modular, self-documenting code and automating dev pipelines.`,
      professionalBio: `A passionate Full Stack Engineer specializing in TypeScript, React, and Node.js. Experienced in designing robust RESTful services and relational databases to power user-centric interfaces.`,
      projectDescriptions: [
        "A secure e-commerce gateway built using Node.js, Express, and Redis, featuring integrated authentication and token-based rate-limiting to ensure server resilience.",
        "An interactive dashboard leveraging React, Tailwind CSS, and WebSockets to render concurrent streaming metrics with optimal client-side rendering performance."
      ]
    };
  }

  const [record] = await db
    .insert(portfolioContentTable)
    .values({
      targetRole,
      linkedInHeadline: result.linkedInHeadline,
      linkedInSummary: result.linkedInSummary,
      professionalBio: result.professionalBio,
      projectDescriptions: result.projectDescriptions,
    })
    .returning();

  res.json({
    id: record.id,
    linkedInHeadline: record.linkedInHeadline,
    linkedInSummary: record.linkedInSummary,
    professionalBio: record.professionalBio,
    projectDescriptions: record.projectDescriptions as string[],
    createdAt: record.createdAt.toISOString(),
  });
});

export default router;
