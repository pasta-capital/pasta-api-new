import { Request, Response } from "express";
import { checkAndNotifyUpcomingPayments } from "../services/upcomingPaymentService";

/**
 * Trigger upcoming payment notifications.
 * This endpoint should be called by a scheduler (cron job) or manually by an admin.
 */
export const triggerUpcomingNotifications = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await checkAndNotifyUpcomingPayments();
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error checking upcoming payments:", error);
    return res.status(500).json({
      success: false,
      message: "Error al verificar cuotas próximas a vencer",
      error: error.message || error,
    });
  }
};
