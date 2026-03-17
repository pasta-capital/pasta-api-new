export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  platform?: "ios" | "android";
}

export interface DeviceToken {
  user_id: string;
  token: string;
  platform: "ios" | "android";
  is_active: boolean;
}
