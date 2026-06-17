import { Router } from "express";
import { db, interviewSessionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { openai } from "../lib/openai";
import { StartInterviewBody, SubmitAnswerBody, SubmitAnswerParams } from "@workspace/api-zod";

const router = Router();

router.post("/interview/start", async (req, res): Promise<void> => {
  const parsed = StartInterviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { role, experienceLevel } = parsed.data;

  const prompt = `You are an AI interviewer conducting a mock job interview for a ${experienceLevel} ${role} position.

Ask the FIRST interview question. This should be an opening question appropriate for the role and level.
Return a JSON object with EXACTLY this structure:
{
  "question": "<the first interview question>"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    res.status(500).json({ error: "Failed to start interview" });
    return;
  }

  let result: { question: string };
  try {
    result = JSON.parse(content);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const [session] = await db
    .insert(interviewSessionsTable)
    .values({
      role,
      experienceLevel,
      firstQuestion: result.question,
      questionsAnswered: 0,
      isComplete: false,
      turns: [],
    })
    .returning();

  res.status(201).json({
    id: session.id,
    role: session.role,
    experienceLevel: session.experienceLevel,
    firstQuestion: session.firstQuestion,
    createdAt: session.createdAt.toISOString(),
  });
});

router.post("/interview/:sessionId/answer", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const params = SubmitAnswerParams.safeParse({ sessionId: rawId });
  if (!params.success) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const body = SubmitAnswerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(interviewSessionsTable)
    .where(eq(interviewSessionsTable.id, params.data.sessionId));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.isComplete) {
    res.status(400).json({ error: "Interview already complete" });
    return;
  }

  const { answer, questionNumber, previousQuestion } = body.data;

  const shouldEnd = questionNumber >= 5;

  const prompt = `You are an AI interviewer for a ${session.experienceLevel} ${session.role} position.

The candidate just answered question ${questionNumber}: "${previousQuestion}"
Their answer: "${answer}"

${shouldEnd
    ? `This was question ${questionNumber} and the interview should now conclude.
Evaluate the answer, then provide concluding remarks.
Return JSON with EXACTLY this structure:
{
  "feedback": "<specific feedback on this answer>",
  "score": <0-100>,
  "improvementSuggestions": ["<suggestion1>", "<suggestion2>"],
  "isComplete": true,
  "concludingRemarks": "<2-3 sentences summarizing the overall performance and encouragement>",
  "overallScore": <estimated overall score 0-100>
}`
    : `Evaluate their answer and ask the next question.
Return JSON with EXACTLY this structure:
{
  "feedback": "<specific feedback on this answer>",
  "score": <0-100>,
  "improvementSuggestions": ["<suggestion1>", "<suggestion2>"],
  "nextQuestion": "<the next interview question>",
  "isComplete": false
}`}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    res.status(500).json({ error: "Failed to evaluate answer" });
    return;
  }

  let result: {
    feedback: string;
    score: number;
    improvementSuggestions: string[];
    nextQuestion?: string;
    isComplete: boolean;
    concludingRemarks?: string;
    overallScore?: number;
  };

  try {
    result = JSON.parse(content);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const existingTurns = (session.turns as Array<{ question: string; answer: string; score: number }>) || [];
  const newTurn = { question: previousQuestion, answer, score: result.score };
  const updatedTurns = [...existingTurns, newTurn];

  await db
    .update(interviewSessionsTable)
    .set({
      questionsAnswered: questionNumber,
      isComplete: result.isComplete,
      turns: updatedTurns,
      overallScore: result.overallScore ?? null,
    })
    .where(eq(interviewSessionsTable.id, session.id));

  res.json({
    nextQuestion: result.nextQuestion ?? null,
    feedback: result.feedback,
    score: result.score,
    improvementSuggestions: result.improvementSuggestions ?? [],
    isComplete: result.isComplete,
    concludingRemarks: result.concludingRemarks ?? null,
    overallScore: result.overallScore ?? null,
  });
});

router.get("/interview/history", async (_req, res): Promise<void> => {
  const records = await db
    .select({
      id: interviewSessionsTable.id,
      role: interviewSessionsTable.role,
      experienceLevel: interviewSessionsTable.experienceLevel,
      overallScore: interviewSessionsTable.overallScore,
      questionsAnswered: interviewSessionsTable.questionsAnswered,
      createdAt: interviewSessionsTable.createdAt,
    })
    .from(interviewSessionsTable)
    .orderBy(desc(interviewSessionsTable.createdAt))
    .limit(20);

  res.json(
    records.map((r) => ({
      id: r.id,
      role: r.role,
      experienceLevel: r.experienceLevel,
      overallScore: r.overallScore,
      questionsAnswered: r.questionsAnswered,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

export default router;
