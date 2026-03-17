import Notifications from "../models/Notifications";
import NotificationUsers from "../models/NotificationUsers";
import UsersGroup from "../models/UsersGroup";
import User from "../models/User";
import Admin from "../models/admin";
import * as mailHelper from "../common/mailHelper";
import { sendSms } from "../common/messageHelper";
import { sendPush } from "../common/pushHelper";
import { parseTitleAndDescription } from "../common/templateHelper";
import * as env from "../config/env.config";
import { Types } from "mongoose";
import { template } from "../common/templates";
import PushToken from "../models/PushToken";

function dedupeIds(ids: (string | Types.ObjectId)[]) {
  const set = new Set(ids.map((x) => String(x)));
  return Array.from(set).map((x) => new Types.ObjectId(x));
}

function getUserPhoneNumber(user: any): string | null {
  if (!user?.phone) return null;
  if (typeof user.phone === "string") return user.phone; // assume e164
  const country = user.phone.countryCode || "";
  const area = user.phone.areaCode || "";
  const number = user.phone.number || "";
  const raw = `${country}${area}${number}`.replace(/\s|-/g, "");
  return raw ? raw : null;
}

export async function resolveTargetUsers(
  users?: Types.ObjectId[] | string[],
  group?: Types.ObjectId | string | null,
) {
  let ids: Types.ObjectId[] = [];
  if (users && users.length)
    ids = ids.concat(users.map((u) => new Types.ObjectId(u)));
  if (group) {
    const grp = await UsersGroup.findById(group);
    if (grp && grp.users?.length) {
      ids = ids.concat(grp.users as Types.ObjectId[]);
    }
  }
  return dedupeIds(ids);
}

export async function sendCampaign(notificationId: string) {
  const notif = await Notifications.findById(notificationId);
  if (!notif) throw new Error("Notification not found");

  // Resolve recipients
  const recipientIds = await resolveTargetUsers(
    notif.users as any,
    notif.group as any,
  );
  const isAdminAudience = (notif as any).audience === "ADMIN";
  const users = isAdminAudience
    ? await Admin.find({ _id: { $in: recipientIds } }).select(
        "name lastname email phone pushToken pushTokens",
      )
    : await User.find({ _id: { $in: recipientIds } }).select(
        "name lastname email document address phone pushToken pushTokens notificationsConfig",
      );

  // Mark campaign as processing
  notif.status = "processing";
  await notif.save();

  for (const u of users) {
    const user = u as any;
    const { title, description } = parseTitleAndDescription(
      notif.title,
      notif.description,
      u,
    );

    // Check notification preferences for users
    if (!isAdminAudience && user.notificationsConfig) {
      const type = notif.type; // MOBILE, EMAIL, SMS, INTERNAL
      let configKey: "push" | "email" | "sms" | "promotions" | null = null;

      if (type === "MOBILE") configKey = "push";
      else if (type === "EMAIL") configKey = "email";
      else if (type === "SMS") configKey = "sms";

      if (configKey && user.notificationsConfig[configKey] === false) {
        // Skip if channel is disabled
        continue;
      }

      if (
        notif.isPromotional &&
        user.notificationsConfig.promotions === false
      ) {
        // Skip if promotional and promotions disabled
        continue;
      }
    }

    const entry = await NotificationUsers.create({
      campaignId: notif._id,
      recipientType: isAdminAudience ? "ADMIN" : "USER",
      type: notif.type,
      infoType: (notif as any).infoType || "NEUTRAL",
      title,
      description,
      imageUrl: notif.imageUrl || null,
      link: notif.link || null,
      userId: isAdminAudience ? null : (u as any)._id,
      adminId: isAdminAudience ? (u as any)._id : null,
      status: "queued",
    });

    try {
      if (notif.type === "INTERNAL") {
        await entry.updateOne({ status: "sent" });
        continue;
      }

      if (notif.type === "EMAIL") {
        if (!(u as any).email) {
          throw new Error("Recipient has no email");
        }
        const html = template(`
          <div class="v14_1932">${title}</div>
          <div class="v14_1933">${description}</div>
        `);

        await mailHelper.sendMail({
          from: env.SMTP_FROM,
          to: (u as any).email,
          subject: title,
          html,
        } as any);
        await entry.updateOne({ status: "sent" });
      } else if (notif.type === "SMS") {
        const to = getUserPhoneNumber(u as any);
        if (!to) throw new Error("Recipient has no phone");
        await sendSms(to, `PASTA - ${description}`);
        await entry.updateOne({ status: "sent" });
      } else if (notif.type === "MOBILE") {
        // Source of truth: PushToken collection
        const ownerFilter = isAdminAudience
          ? { ownerType: "ADMIN" as const, adminId: (u as any)._id }
          : { ownerType: "USER" as const, userId: (u as any)._id };
        const tokenDocs = await PushToken.find({
          ...ownerFilter,
          status: "active",
        }).select("token");
        const tokens = tokenDocs.map((d) => d.token);

        if (tokens.length === 0) {
          throw new Error("No active push tokens found for recipient");
        }

        let anySuccess = false;
        const invalidTokens: string[] = [];
        for (const t of tokens) {
          const resp = await sendPush(
            t,
            title,
            description,
            notif.imageUrl,
            notif.link,
          );
          if (resp.success) {
            anySuccess = true;
          } else {
            // Robust detection using errorCode and errorMessage fallback
            const errorCode = (resp as any).errorCode || "";
            const errorMessage = String(
              (resp as any).errorMessage || (resp as any).error || "",
            ).toLowerCase();

            const isInvalidToken =
              errorCode === "messaging/registration-token-not-registered" ||
              errorCode === "messaging/invalid-registration-token" ||
              errorMessage.includes("registration-token-not-registered") ||
              errorMessage.includes("invalid-registration-token") ||
              errorMessage.includes("notregistered") ||
              errorMessage.includes("token no longer registered");

            if (isInvalidToken) {
              invalidTokens.push(t);
            }
          }
        }

        // Mark invalid tokens as inactive
        if (invalidTokens.length) {
          try {
            const updateResult = await PushToken.updateMany(
              { token: { $in: invalidTokens } },
              { $set: { status: "inactive", lastUsedAt: new Date() } },
            );

            // Log summary for observability
            console.log(
              `[Push Notification] User ${(u as any)._id}: ${tokens.length} active tokens, ${invalidTokens.length} invalid tokens detected and marked inactive (${updateResult.modifiedCount} updated)`,
            );

            // Legacy cleanup on profile arrays (best-effort)
            try {
              const current = Array.isArray((u as any).pushTokens)
                ? ((u as any).pushTokens as string[])
                : [];
              const next = current.filter((t) => !invalidTokens.includes(t));
              (u as any).pushTokens = next;
              if (
                (u as any).pushToken &&
                invalidTokens.includes((u as any).pushToken)
              ) {
                (u as any).pushToken = next[0] || (undefined as any);
              }
              await u.save();
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error(
                "Legacy cleanup failed for recipient",
                (u as any)._id,
                e,
              );
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(
              "Failed to deactivate invalid push tokens",
              invalidTokens.length,
              e,
            );
          }
        }

        if (!anySuccess) throw new Error("Push failed for all tokens");
        await entry.updateOne({ status: "sent" });
      }
    } catch (error) {
      await entry.updateOne({ status: "failed" });
      // eslint-disable-next-line no-console
      console.error("Delivery failed for user", u._id, error);
    }
  }

  // Finalize campaign status
  const failed = await NotificationUsers.countDocuments({
    campaignId: notif._id,
    status: "failed",
  });
  notif.status = failed > 0 ? "failed" : "sent";
  await notif.save();

  return { success: true };
}

export async function createAndSendCampaign(data: any) {
  const notif = await Notifications.create(data);

  await sendCampaign(String(notif._id));
}
