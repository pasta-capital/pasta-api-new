import OperationPayment from "../models/operationPayment";
import User from "../models/User";
import { createAndSendCampaign } from "./notificationService";
import { Types } from "mongoose";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { getUpcomingPaymentNotificationDays } from "./notificationSettingsService";

/**
 * Check for upcoming payments based on configured days before due date and notify users.
 * Returns a summary of users notified.
 */
export async function checkAndNotifyUpcomingPayments() {
  const fixedTimeZone = "America/Caracas";
  const caracasTodayStr = formatInTimeZone(
    new Date(),
    fixedTimeZone,
    "yyyy-MM-dd",
  );

  // Get configured notification days (defaults to [7, 3, 1, 0] if not configured)
  const notificationDays = await getUpcomingPaymentNotificationDays();

  // Build time windows dynamically from configuration
  const timeWindows = notificationDays.map((days) => {
    let label: string;
    if (days === 0) {
      label = "hoy";
    } else if (days === 1) {
      label = "1 día";
    } else {
      label = `${days} días`;
    }
    return { days, label };
  });

  let totalNotifiedCount = 0;
  const notificationResults: any[] = [];

  for (const window of timeWindows) {
    // Calculate the target day in Caracas
    const targetDate = new Date(caracasTodayStr + "T00:00:00");
    targetDate.setDate(targetDate.getDate() + window.days);

    const targetDayStr = targetDate.toISOString().split("T")[0];

    const startOfUtcDay = fromZonedTime(
      `${targetDayStr}T00:00:00`,
      fixedTimeZone,
    );
    const endOfUtcDay = fromZonedTime(
      `${targetDayStr}T23:59:59.999`,
      fixedTimeZone,
    );

    // Find all pending payments due on this specific date
    const usersWithUpcoming = await OperationPayment.aggregate([
      {
        $match: {
          status: "pending",
          date: {
            $gte: startOfUtcDay,
            $lte: endOfUtcDay,
          },
        },
      },
      {
        $group: {
          _id: "$user",
          upcomingCount: { $sum: 1 },
          totalUpcomingAmount: {
            $sum: {
              $cond: [
                { $gt: ["$amountUsdTotal", 0] },
                "$amountUsdTotal",
                "$amountUsd",
              ],
            },
          },
          dueDate: { $first: "$date" },
        },
      },
    ]);

    if (usersWithUpcoming.length === 0) {
      notificationResults.push({
        window: window.label,
        notifiedCount: 0,
      });
      continue;
    }

    const userIds = usersWithUpcoming.map((u) => u._id);

    // Verify these users are still active
    const activeUsers = await User.find({
      _id: { $in: userIds },
      status: "active",
    }).select("_id name lastname notificationsConfig");

    const activeUserIds = new Set(activeUsers.map((u) => String(u._id)));

    let windowNotifiedCount = 0;

    for (const upcomingData of usersWithUpcoming) {
      const userId = String(upcomingData._id);
      if (!activeUserIds.has(userId)) {
        continue; // Skip inactive users
      }

      const user = activeUsers.find((u) => String(u._id) === userId);
      if (!user) continue;

      const userName = `${user.name}`;

      // Customize message based on time window
      let title: string;
      let description: string;

      if (window.days === 0) {
        title = "Tu cuota vence hoy";
        description = `Hola ${userName}, tienes ${upcomingData.upcomingCount} cuota(s) que vence(n) hoy por un total de $${upcomingData.totalUpcomingAmount.toFixed(2)}. No olvides realizar el pago.`;
      } else if (window.days === 1) {
        title = "Tu cuota vence mañana";
        description = `Hola ${userName}, tienes ${upcomingData.upcomingCount} cuota(s) que vence(n) mañana por un total de $${upcomingData.totalUpcomingAmount.toFixed(2)}. Recuerda realizar el pago a tiempo.`;
      } else {
        title = `Tu cuota vence en ${window.days} días`;
        description = `Hola ${userName}, tienes ${upcomingData.upcomingCount} cuota(s) que vence(n) en ${window.days} días por un total de $${upcomingData.totalUpcomingAmount.toFixed(2)}. Recuerda realizar el pago a tiempo.`;
      }

      const baseNotification = {
        audience: "USER",
        infoType: window.days === 0 ? "WARNING" : "NEUTRAL",
        title,
        description,
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
        windowNotifiedCount++;
      }
    }

    totalNotifiedCount += windowNotifiedCount;
    notificationResults.push({
      window: window.label,
      notifiedCount: windowNotifiedCount,
    });
  }

  return {
    success: true,
    message: `Se notificaron ${totalNotifiedCount} usuarios en total`,
    totalNotifiedCount,
    details: notificationResults,
  };
}
