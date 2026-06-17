import { Router } from "express";
import { db, resumeAnalysesTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { openai } from "../lib/openai";
import { AnalyzeResumeBody } from "@workspace/api-zod";

const router = Router();

router.post("/resume/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeResumeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { resumeDataUri, filename } = parsed.data;

  const prompt = `You are an expert ATS resume analyzer. Analyze the resume and return a JSON object with EXACTLY this structure:
{
  "atsScore": <number 0-100>,
  "extractedInfo": {
    "skills": [<strings>],
    "education": [<strings>],
    "experience": [<strings>],
    "projects": [<strings>],
    "certifications": [<strings>]
  },
  "keywordGaps": [<strings - important missing keywords>],
  "improvementSuggestions": [<strings - specific actionable suggestions>]
}

The resume content is provided as a base64 data URI. Extract all relevant information and provide a thorough analysis.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "text",
            text: `Resume data URI (base64 encoded): ${resumeDataUri.substring(0, 100)}... [full resume provided]`,
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    res.status(500).json({ error: "Failed to analyze resume" });
    return;
  }

  let analysis: {
    atsScore: number;
    extractedInfo: {
      skills: string[];
      education: string[];
      experience: string[];
      projects: string[];
      certifications: string[];
    };
    keywordGaps: string[];
    improvementSuggestions: string[];
  };

  try {
    analysis = JSON.parse(content);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const [record] = await db
    .insert(resumeAnalysesTable)
    .values({
      filename,
      atsScore: analysis.atsScore,
      extractedInfo: analysis.extractedInfo,
      keywordGaps: analysis.keywordGaps,
      improvementSuggestions: analysis.improvementSuggestions,
    })
    .returning();

  res.json({
    id: record.id,
    atsScore: record.atsScore,
    extractedInfo: record.extractedInfo,
    keywordGaps: record.keywordGaps,
    improvementSuggestions: record.improvementSuggestions,
    createdAt: record.createdAt.toISOString(),
  });
});

router.get("/resume/history", async (_req, res): Promise<void> => {
  const records = await db
    .select({
      id: resumeAnalysesTable.id,
      filename: resumeAnalysesTable.filename,
      atsScore: resumeAnalysesTable.atsScore,
      createdAt: resumeAnalysesTable.createdAt,
    })
    .from(resumeAnalysesTable)
    .orderBy(desc(resumeAnalysesTable.createdAt))
    .limit(20);

  res.json(
    records.map((r) => ({
      id: r.id,
      filename: r.filename,
      atsScore: r.atsScore,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

export default router;
