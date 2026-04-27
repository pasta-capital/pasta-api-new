import Notifications from "../models/Notifications";
import { sendCampaign } from "./notificationService";
import { processCyclicQueue } from "./operationService";
import { checkAndNotifyUpcomingPayments } from "./upcomingPaymentService";
import { checkAndNotifyOverduePayments } from "./overduePaymentService";
import { generateMonthlyHistory } from "./customerHistoryService";
import * as loggers from "../common/logger";
let notificationTimer: NodeJS.Timeout | null = null;
let debtTimer: NodeJS.Timeout | null = null;
let upcomingPaymentTimer: NodeJS.Timeout | null = null;
let upcomingPaymentInitialTimeout: NodeJS.Timeout | null = null;
let isProcessing = false;
async function runDailyPaymentNotifications() {
  try {
    await checkAndNotifyUpcomingPayments();
    await checkAndNotifyOverduePayments();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Daily Payment Notifications Scheduler error:", error);
  }
}
let lastRunMonth: number | null = null;

export function startNotificationScheduler(intervalMs = 60_000) {
  if (notificationTimer) return; // already running
  notificationTimer = setInterval(async () => {
    try {
      const now = new Date();

      // Monthly Customer History Logic
      // Run on the 1st day of the month at 00:00 (approx)
      if (now.getDate() === 1 && now.getMonth() !== lastRunMonth) {
        generateMonthlyHistory(now).catch((err) =>
          console.error("Monthly history failed:", err),
        );
        lastRunMonth = now.getMonth();
      }

      const due = await Notifications.find({
        status: "scheduled",
        sendAt: { $lte: now },
      })
        .sort({ sendAt: 1 })
        .limit(10);

      for (const campaign of due) {
        try {
          await sendCampaign(String(campaign._id));
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Scheduled campaign failed:", campaign._id, err);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Notification Scheduler error:", error);
    }
  }, intervalMs);
}

export function stopNotificationScheduler() {
  if (notificationTimer) clearInterval(notificationTimer as any);
  notificationTimer = null;
}

export function startDebtScheduler(intervalMs = 60_000) {
  if (debtTimer) return;

  debtTimer = setInterval(async () => {
    if (isProcessing) {
      loggers.operation(
        "Debt Scheduler: Previous sweep still active, skipping tick.",
      );
      return;
    }
    try {
      isProcessing = true;
      console.log("Running Debt Scheduler...");
      await processCyclicQueue(); //await syncPendingDebts();
    } catch (error) {
      console.error("Debt Scheduler error:", error);
    } finally {
      isProcessing = false;
    }
  }, intervalMs);
}

export function stopDebtScheduler() {
  if (debtTimer) clearInterval(debtTimer as any);
  debtTimer = null;
}

type DailyScheduleOptions = {
  hour: number;
  minute?: number;
};

function getDelayUntilNextRun(hour: number, minute = 0) {
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(hour, minute, 0, 0);

  if (nextRun.getTime() <= now.getTime()) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun.getTime() - now.getTime();
}

export function startDailyPaymentNotificationsScheduler(
  intervalMs = 86400000,
  scheduleAt?: DailyScheduleOptions,
) {
  // Every 24 hours (daily)
  if (upcomingPaymentTimer || upcomingPaymentInitialTimeout) return;

  if (!scheduleAt) {
    upcomingPaymentTimer = setInterval(
      runDailyPaymentNotifications,
      intervalMs,
    );
    return;
  }

  const delayMs = getDelayUntilNextRun(scheduleAt.hour, scheduleAt.minute ?? 0);
  upcomingPaymentInitialTimeout = setTimeout(() => {
    runDailyPaymentNotifications();
    upcomingPaymentTimer = setInterval(
      runDailyPaymentNotifications,
      intervalMs,
    );

    if (upcomingPaymentInitialTimeout) {
      clearTimeout(upcomingPaymentInitialTimeout as any);
      upcomingPaymentInitialTimeout = null;
    }
  }, delayMs);
}

export function stopDailyPaymentNotificationsScheduler() {
  if (upcomingPaymentTimer) clearInterval(upcomingPaymentTimer as any);
  if (upcomingPaymentInitialTimeout)
    clearTimeout(upcomingPaymentInitialTimeout as any);
  upcomingPaymentTimer = null;
  upcomingPaymentInitialTimeout = null;
}
