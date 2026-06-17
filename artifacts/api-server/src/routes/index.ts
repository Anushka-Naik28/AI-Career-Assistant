import { Router, type IRouter } from "express";
import healthRouter from "./health";
import resumeRouter from "./resume";
import jobsRouter from "./jobs";
import roadmapRouter from "./roadmap";
import interviewRouter from "./interview";
import portfolioRouter from "./portfolio";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(resumeRouter);
router.use(jobsRouter);
router.use(roadmapRouter);
router.use(interviewRouter);
router.use(portfolioRouter);
router.use(analyticsRouter);

export default router;
