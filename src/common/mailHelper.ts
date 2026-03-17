import nodemailer from "nodemailer";
import net from "net";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import * as env from "../config/env.config";

/**
 * Send an email.
 *
 * @export
 * @param {nodemailer.SendMailOptions} mailOptions
 * @returns {Promise<unknown>}
 */
export const sendMail = async (
  mailOptions: nodemailer.SendMailOptions,
): Promise<nodemailer.SentMessageInfo | null> => {
  try {
    const transporterOptions: SMTPTransport.Options = {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      //secure: false,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      // tls: { servername: env.SMTP_HOST },
    };

    const transporter = nodemailer.createTransport(transporterOptions);

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error("Error al enviar correo:", error);
    return null;
  }
};
