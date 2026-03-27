import { Router } from "express";
import {
  diditVerification,
  diditDeleteSession,
} from "../controllers/diditController";

const router = Router();

router.get("/verification/:sessionId", diditVerification);

router.delete("/:sessionId/delete", diditDeleteSession);

export default router;
