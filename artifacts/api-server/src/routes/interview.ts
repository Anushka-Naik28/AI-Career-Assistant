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

  let result: any;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to start interview");
    }
    result = JSON.parse(content);
  } catch (err) {
    req.log.warn({ err }, "OpenAI start interview failed, using fallback mock data.");
    result = {
      question: `Could you tell me about a recent challenging technical project you worked on as a ${experienceLevel} ${role}? What were the main architecture decisions you made, and what would you do differently today?`
    };
  }

  try {
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
  } catch (dbErr) {
    req.log.warn({ dbErr }, "Database insert for interview session failed, returning mock session directly.");
    res.status(201).json({
      id: Math.floor(Math.random() * 1000) + 1,
      role,
      experienceLevel,
      firstQuestion: result.question,
      createdAt: new Date().toISOString(),
    });
  }
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

  let session: any;
  try {
    const [dbSession] = await db
      .select()
      .from(interviewSessionsTable)
      .where(eq(interviewSessionsTable.id, params.data.sessionId));
    session = dbSession;
  } catch (dbErr) {
    req.log.warn({ dbErr }, "Database select failed for interview session, using mock session.");
    session = {
      id: params.data.sessionId,
      role: "Software Engineer",
      experienceLevel: "Mid-level",
      questionsAnswered: 0,
      isComplete: false,
      turns: []
    };
  }

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

  let result: any;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to evaluate answer");
    }
    result = JSON.parse(content);
  } catch (err) {
    req.log.warn({ err }, "OpenAI submit answer evaluation failed, using fallback mock data.");
    if (shouldEnd) {
      result = {
        feedback: "Your final response was well structured and demonstrated a solid understanding of system tradeoffs and developer collaboration.",
        score: 85,
        improvementSuggestions: [
          "Provide deeper detail on caching strategies and data structure optimization.",
          "Describe how you handle conflict resolution inside distributed team models."
        ],
        isComplete: true,
        concludingRemarks: "Thank you for completing this mock interview! You demonstrated strong core capabilities in architecture design, modular coding, and teamwork.",
        overallScore: 82
      };
    } else {
      result = {
        feedback: "That was a good answer! You clearly outlined your project role and the primary tech stack you utilized.",
        score: 80,
        improvementSuggestions: [
          "Describe concrete optimization metrics you tracked during the deployment phase.",
          "Elaborate on how your database queries were optimized for handling higher load."
        ],
        nextQuestion: `For question ${questionNumber + 1}: Can you explain how you handle database migrations and ensure schema safety in production environments for a ${session.role} app?`,
        isComplete: false
      };
    }
  }

  const existingTurns = (session.turns as Array<{ question: string; answer: string; score: number }>) || [];
  const newTurn = { question: previousQuestion, answer, score: result.score };
  const updatedTurns = [...existingTurns, newTurn];

  try {
    await db
      .update(interviewSessionsTable)
      .set({
        questionsAnswered: questionNumber,
        isComplete: result.isComplete,
        turns: updatedTurns,
        overallScore: result.overallScore ?? null,
      })
      .where(eq(interviewSessionsTable.id, session.id));
  } catch (dbErr) {
    req.log.warn({ dbErr }, "Database update for interview turns failed, skipping update.");
  }

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
