import { Request, Response } from "express";
import { checkAndNotifyOverduePayments } from "../services/overduePaymentService";

/**
 * Trigger overdue payment notifications.
 * This endpoint should be called by a scheduler (cron job) or manually by an admin.
 */
export const triggerOverdueNotifications = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await checkAndNotifyOverduePayments();
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error checking overdue payments:", error);
    return res.status(500).json({
      success: false,
      message: "Error al verificar cuotas vencidas",
      error: error.message || error,
    });
  }
};
