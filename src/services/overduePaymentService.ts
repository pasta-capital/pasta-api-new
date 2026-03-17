import OperationPayment from "../models/operationPayment";
import User from "../models/User";
import { createAndSendCampaign } from "./notificationService";
import { Types } from "mongoose";

/**
 * Check for overdue payments and notify each affected user.
 * Returns a summary of users notified.
 */
export async function checkAndNotifyOverduePayments() {
  // Find all overdue/inArrears payments grouped by user
  const usersWithOverdue = await OperationPayment.aggregate([
    {
      $match: {
        status: { $in: ["overdue", "inArrears"] },
      },
    },
    {
      $group: {
        _id: "$user",
        overdueCount: { $sum: 1 },
        totalOverdueAmount: {
          $sum: {
            $cond: [{ $gt: ["$amountUsdTotal", 0] }, "$amountUsdTotal", "$amountUsd"],
          },
        },
        oldestDueDate: { $min: "$date" },
      },
    },
  ]);

  if (usersWithOverdue.length === 0) {
    return { success: true, message: "No hay cuotas vencidas", notifiedCount: 0 };
  }

  const userIds = usersWithOverdue.map((u) => u._id);

  // Verify these users are still active
  const activeUsers = await User.find({
    _id: { $in: userIds },
    status: "active",
  }).select("_id name lastname notificationsConfig");

  const activeUserIds = new Set(activeUsers.map((u) => String(u._id)));

  let notifiedCount = 0;

  for (const overdueData of usersWithOverdue) {
    const userId = String(overdueData._id);
    if (!activeUserIds.has(userId)) {
      continue; // Skip inactive users
    }

    const user = activeUsers.find((u) => String(u._id) === userId);
    if (!user) continue;

    const userName = `${user.name}`;
    const baseNotification = {
      audience: "USER",
      infoType: "WARNING",
      title: "Tienes una cuota vencida",
      description: `Hola ${userName}, tienes ${overdueData.overdueCount} cuota(s) vencida(s) por un total de $${overdueData.totalOverdueAmount.toFixed(2)}. Por favor, realiza el pago lo antes posible.`,
      users: [new Types.ObjectId(userId)],
      status: "scheduled",
      isPromotional: false,
    };

    const config = (user as any).notificationsConfig || {
      email: true,
      sms: true,
      push: true,
    };

    const typesToSend: ("MOBILE" | "EMAIL" | "SMS")[] = [];
    if (config.push !== false) typesToSend.push("MOBILE");
    if (config.email !== false) typesToSend.push("EMAIL");
    if (config.sms !== false) typesToSend.push("SMS");

    for (const type of typesToSend) {
      await createAndSendCampaign({
        ...baseNotification,
        type,
      });
    }

    if (typesToSend.length > 0) {
      notifiedCount++;
    }
  }

  return {
    success: true,
    message: `Se notificaron ${notifiedCount} usuarios con cuotas vencidas`,
    notifiedCount,
  };
}
