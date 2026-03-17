import twilio from "twilio";
import * as env from "../config/env.config";

/**
 * Send an SMS.
 *
 * @export
 * @param {string} to
 * @param {string} message
 * @returns {Promise<unknown>}
 */
export const sendSms = async (to: string, message: string) => {
  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

  const messageData = {
    body: message,
    from: env.TWILIO_PHONE_NUMBER,
    to: to,
  };

  return await client.messages.create(messageData);
};

/**
 * Send a whatsapp message.
 *
 * @export
 * @param {string} to
 * @param {string} message
 * @returns {Promise<unknown>}
 */
export const sendWhatsapp = async (to: string, message: string) => {
  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

  const messageData = {
    body: message,
    from: `whatsapp:${env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${to}`,
  };

  return await client.messages.create(messageData);
};
