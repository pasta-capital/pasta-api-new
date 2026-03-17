// src/services/firebase.service.ts
import { NotificationPayload } from "../common/interfaces/notification.interface";
import { firebaseAdmin } from "../config/firebaseAdmin";
import {
  getMessaging,
  Messaging,
  BatchResponse,
  MessagingTopicManagementResponse,
  TokenMessage,
  MulticastMessage,
  TopicMessage,
  Message,
} from "firebase-admin/messaging";

export class FirebaseService {
  private messaging: Messaging;
  private static instance: FirebaseService;

  private constructor() {
    this.messaging = getMessaging(firebaseAdmin);
  }

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  /**
   * Envía una notificación a un dispositivo específico
   * @param token Token del dispositivo
   * @param payload Contenido de la notificación
   * @returns Promise con el ID del mensaje enviado
   */
  public async sendToDevice(
    token: string,
    payload: NotificationPayload,
  ): Promise<string> {
    try {
      if (!token || typeof token !== "string") {
        throw new Error("Device token must be a non-empty string");
      }
      // Ahora usamos buildTokenMessage para ser explícitos
      const message = this.buildTokenMessage(token, payload);
      return await this.messaging.send(message);
    } catch (error: any) {
      // Don't log expected token errors as critical - they're handled upstream
      const isExpectedTokenError =
        error?.code === "messaging/registration-token-not-registered" ||
        error?.code === "messaging/invalid-registration-token";

      if (!isExpectedTokenError) {
        console.error("Error sending to device:", error);
      }
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Envía una notificación a múltiples dispositivos
   * @param tokens Lista de tokens de dispositivos
   * @param payload Contenido de la notificación
   * @returns Resultado del envío multicasta
   */
  public async sendToDevices(
    tokens: string[],
    payload: NotificationPayload,
  ): Promise<BatchResponse> {
    try {
      if (
        !tokens ||
        tokens.length === 0 ||
        tokens.some((token) => !token || typeof token !== "string")
      ) {
        throw new Error("Tokens must be a non-empty array of strings");
      }
      const message = this.buildMulticastMessage(tokens, payload);
      return await this.messaging.sendEachForMulticast(message);
    } catch (error) {
      console.error("Error sending to devices:", error);
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Suscribe dispositivos a un topic
   * @param tokens Token o lista de tokens
   * @param topic Topic al que suscribir
   * @returns Respuesta de la operación
   */
  public async subscribeToTopic(
    tokens: string | string[],
    topic: string,
  ): Promise<MessagingTopicManagementResponse> {
    try {
      if (!topic || typeof topic !== "string") {
        throw new Error("Topic name must be a non-empty string");
      }
      if (
        (Array.isArray(tokens) && tokens.length === 0) ||
        (!Array.isArray(tokens) && (!tokens || typeof tokens !== "string"))
      ) {
        throw new Error(
          "Tokens must be a non-empty string or array of strings",
        );
      }
      return await this.messaging.subscribeToTopic(tokens, topic);
    } catch (error) {
      console.error("Error subscribing to topic:", error);
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Desuscribe dispositivos de un topic
   * @param tokens Token o lista de tokens
   * @param topic Topic del que desuscribir
   * @returns Respuesta de la operación
   */
  public async unsubscribeFromTopic(
    tokens: string | string[],
    topic: string,
  ): Promise<MessagingTopicManagementResponse> {
    try {
      if (!topic || typeof topic !== "string") {
        throw new Error("Topic name must be a non-empty string");
      }
      if (
        (Array.isArray(tokens) && tokens.length === 0) ||
        (!Array.isArray(tokens) && (!tokens || typeof tokens !== "string"))
      ) {
        throw new Error(
          "Tokens must be a non-empty string or array of strings",
        );
      }
      return await this.messaging.unsubscribeFromTopic(tokens, topic);
    } catch (error) {
      console.error("Error unsubscribing from topic:", error);
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Envía una notificación a todos los dispositivos suscritos a un topic
   * @param topic Nombre del topic
   * @param payload Contenido de la notificación
   * @returns Promise con el ID del mensaje enviado
   */
  public async sendToTopic(
    topic: string,
    payload: NotificationPayload,
  ): Promise<string> {
    try {
      if (!topic || typeof topic !== "string") {
        throw new Error("Topic name must be a non-empty string");
      }

      // Ahora usamos buildTopicMessage para ser explícitos
      const message = this.buildTopicMessage(topic, payload);
      return await this.messaging.send(message);
    } catch (error) {
      console.error("Error sending to topic:", error);
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Construye el objeto mensaje para un solo dispositivo.
   * @param token Token del dispositivo.
   * @param payload Datos de la notificación.
   * @returns Objeto TokenMessage configurado.
   */
  private buildTokenMessage(
    token: string,
    payload: NotificationPayload,
  ): TokenMessage {
    // <- Cambio aquí: tipo de retorno explícito
    const message: TokenMessage = {
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.data?.imageUrl,
      },
      data: payload.data || {},
      token: token, // Aseguramos que 'token' esté presente
    };

    this.addPlatformSpecificConfig(message, payload);

    return message;
  }

  /**
   * Construye el objeto mensaje para múltiples dispositivos.
   * @param tokens Lista de tokens de dispositivos.
   * @param payload Datos de la notificación.
   * @returns Objeto MulticastMessage configurado.
   */
  private buildMulticastMessage(
    tokens: string[],
    payload: NotificationPayload,
  ): MulticastMessage {
    const message: MulticastMessage = {
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.data?.imageUrl,
      },
      data: payload.data || {},
      tokens: tokens,
    };

    this.addPlatformSpecificConfig(message, payload);

    return message;
  }

  /**
   * Construye el objeto mensaje para un topic.
   * @param topic Nombre del topic.
   * @param payload Datos de la notificación.
   * @returns Objeto TopicMessage configurado.
   */
  private buildTopicMessage(
    topic: string,
    payload: NotificationPayload,
  ): TopicMessage {
    // <- Cambio aquí: tipo de retorno explícito
    const message: TopicMessage = {
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.data?.imageUrl,
      },
      data: payload.data || {},
      topic: topic, // Aseguramos que 'topic' esté presente
    };

    this.addPlatformSpecificConfig(message, payload);

    return message;
  }

  /**
   * Añade configuración específica por plataforma al mensaje.
   * @param message Objeto de mensaje de Firebase.
   * @param payload Datos originales de la notificación para determinar la plataforma.
   */
  private addPlatformSpecificConfig(
    message: Message | MulticastMessage,
    payload: NotificationPayload,
  ): void {
    if (payload.platform === "ios") {
      message.apns = {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            "mutable-content": 1, // Para notificaciones ricas
          },
        },
        headers: {
          "apns-priority": "10", // Entrega inmediata
        },
      };
    } else if (payload.platform === "android") {
      message.android = {
        priority: "high",
        notification: {
          sound: "default",
          channelId: payload.data?.channelId || "default_channel",
          icon: "ic_notification",
          color: "#FF0000", // Color del icono
          tag: payload.data?.tag, // Para agrupar notificaciones
        },
      };
    } else {
      // Configuración por defecto cuando no se especifica plataforma
      message.apns = {
        payload: {
          aps: {
            sound: "default",
          },
        },
      };
      message.android = {
        priority: "high",
        notification: {
          sound: "default",
          channelId: payload.data?.channelId || "default_channel",
        },
      };
    }
  }

  /**
   * Maneja errores específicos de Firebase
   * @param error Error original
   * @returns Error adaptado con código preservado
   */
  private handleFirebaseError(error: any): Error & { code?: string } {
    const errorCode = error?.code;
    let adaptedError: Error & { code?: string };

    if (errorCode === "messaging/invalid-argument") {
      adaptedError = new Error("Invalid message argument: " + error.message);
    } else if (errorCode === "messaging/invalid-registration-token") {
      adaptedError = new Error("Invalid registration token: " + error.message);
    } else if (errorCode === "messaging/registration-token-not-registered") {
      adaptedError = new Error("Token no longer registered: " + error.message);
    } else {
      adaptedError = error instanceof Error
        ? error
        : new Error("Firebase error: " + String(error));
    }

    // Preserve the original error code for upstream detection
    if (errorCode) {
      (adaptedError as any).code = errorCode;
    }

    return adaptedError;
  }
}
