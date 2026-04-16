import { Router } from "express";
import {
  handleImmediateCredit,
  handleDebitToken,
  handleRequestDebit,
} from "../../controllers/bvc-immediate.controller";
import { handleP2PValidation } from "../../controllers/bvc-validation.controller";
import {
  handleCheckStatus,
  handleInternalRefCheck,
} from "../../controllers/bvc-lookup.controller";
import { NODE_ENV } from "../../../config/env.config";

const router = Router();

// --- Healthcheck ---
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "BVC Routes API", // Nombre actualizado
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Credit Routes
router.post("/immediate/credit", handleImmediateCredit);

// Debit Routes (2-Step)
router.post("/immediate/debit/token", handleDebitToken);
router.post("/immediate/debit/request", handleRequestDebit);

// Validation Routes
router.post("/validate/p2p", handleP2PValidation);

// Lookup Routes
router.post("/lookup/singularTx", handleCheckStatus);
router.post("/lookup/internalRef", handleInternalRefCheck);

export default router;
