import * as env from "../config/env.config";
import { FirebaseService } from "../services/firebase.service";
import { NotificationPayload } from "./interfaces/notification.interface";

export async function sendPush(
  token: string,
  title: string,
  body: string,
  imageUrl?: string | null,
  link?: string | null,
) {
  if (!env.FCM_ENABLED) return { success: false, error: "FCM disabled" };

  const payload: NotificationPayload = {
    title,
    body,
    data: {},
  };

  if (imageUrl) {
    (payload.data as Record<string, string>).imageUrl = String(imageUrl);
  }
  if (link) {
    (payload.data as Record<string, string>).link = String(link);
  }

  try {
    const id = await FirebaseService.getInstance().sendToDevice(token, payload);
    console.log("🚀 ~ id:", id);
    return { success: true, id };
  } catch (error: any) {
    // Normalize error response with errorCode and errorMessage
    const errorCode = error?.code || null;
    const errorMessage =
      error?.message || String(error) || "Unknown error occurred";

    return {
      success: false,
      errorCode,
      errorMessage,
      error, // Keep original error for backward compatibility
    };
  }
}
