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

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    res.status(500).json({ error: "Failed to generate portfolio content" });
    return;
  }

  let result: {
    linkedInHeadline: string;
    linkedInSummary: string;
    professionalBio: string;
    projectDescriptions: string[];
  };

  try {
    result = JSON.parse(content);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
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
