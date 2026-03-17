# Grupos de Usuarios y Notificaciones V2

Este documento describe los modelos de datos, configuración y APIs REST agregadas para Grupos de Usuarios y el nuevo flujo de Notificaciones (Campañas). También explica cómo funcionan el templating de mensajes, la programación (scheduling) y los canales de entrega (EMAIL, SMS, MOBILE, INTERNAL).

## Resumen

- Los usuarios pueden organizarse en Grupos reutilizables.
- Los administradores pueden crear Campañas (`Notifications`) que apunten a uno o más usuarios y/o a un grupo.
- El sistema des-duplica destinatarios automáticamente cuando se envían `group` y `users` a la vez.
- Por cada destinatario se crea un documento `NotificationUsers` con el `title` y `description` ya personalizados.
- Los envíos pueden ser por EMAIL (nodemailer), SMS (Twilio), MOBILE (Firebase Cloud Messaging) o INTERNAL (solo almacenamiento interno).
- Las campañas pueden enviarse de inmediato o programarse para una fecha futura (`sendAt`). Un scheduler ligero procesa las campañas vencidas.

## Modelos de Datos

### UsersGroup (`collection: UsersGroup`)

- `title: string` (requerido)
- `description: string | null`
- `users: ObjectId[]` (refs `User`)

### Notifications (Campaña) (`collection: Notifications`)

- `audience: "USER" | "ADMIN"` (requerido, por defecto `USER`) — tipo de destinatarios
- `type: "MOBILE" | "EMAIL" | "INTERNAL" | "SMS"` (requerido)
- `infoType: "NEUTRAL" | "SUCCESS" | "WARNING" | "ERROR" | "BAN"` (por defecto: `NEUTRAL`) — clasificación visual/semántica del mensaje
- `title: string` (requerido) — almacenado con placeholders
- `description: string` (requerido) — almacenado con placeholders
- `imageUrl?: string | null`
- `link?: string | null`
- `users?: ObjectId[]` (refs `User`)
- `group?: ObjectId | null` (ref `UsersGroup`)
- `sendAt?: Date | null` — hora del servidor
- `status: "draft" | "scheduled" | "processing" | "sent" | "failed" | "cancelled"` (por defecto: `draft`)

### NotificationUsers (Entrega) (`collection: NotificationUsers`)

- `campaignId: ObjectId` (ref `Notifications`, requerido)
- `recipientType: "USER" | "ADMIN"` (requerido)
- `type: "MOBILE" | "EMAIL" | "INTERNAL" | "SMS"` (requerido)
- `infoType: "NEUTRAL" | "SUCCESS" | "WARNING" | "ERROR" | "BAN"` (por defecto: `NEUTRAL`)
- `title: string` — personalizado
- `description: string` — personalizado
- `imageUrl?: string | null`
- `link?: string | null`
- `userId?: ObjectId` (ref `User`) — presente si `recipientType = USER`
- `adminId?: ObjectId` (ref `Admin`) — presente si `recipientType = ADMIN`
- `status: "queued" | "sent" | "failed" | "read"` (por defecto: `queued`)
- `readAt?: Date | null`

## Plantillas de Mensaje (Templating)

Usa los siguientes placeholders en `title` y `description`. Se reemplazarán por destinatario:

- `{{name}}`
- `{{lastName}}` (mapeado desde `User.lastname`)
- `{{email}}`
- `{{document}}`
- `{{address}}`

Solo se aceptan estas variables. Variables desconocidas quedan intactas (por ejemplo, `{{foo}}`).

## Formato de Teléfono

Para SMS, el objeto esperado en `User.phone` es:

```json
{
  "countryCode": "+58",
  "number": "12345678"
}
```

Opcionalmente, si existe `areaCode` se concatenará. El número final se construye como `countryCode + areaCode? + number`.

## Configuración de Entorno

Debes definir las siguientes variables según el(los) canal(es) utilizados.

### EMAIL (Nodemailer)

- `P_SMTP_HOST`
- `P_SMTP_PORT`
- `P_SMTP_USER`
- `P_SMTP_PASS`
- `P_SMTP_FROM`

### SMS (Twilio)

- `P_TWILIO_ACCOUNT_SID`
- `P_TWILIO_AUTH_TOKEN`
- `P_TWILIO_PHONE_NUMBER`

### MOBILE (Firebase Cloud Messaging)

- `P_FCM_ENABLED=true`
- Option A: Use default application credentials
  - `GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json`
- Option B: Use explicit credentials (line breaks must be preserved using `\n`)
  - `P_FCM_PROJECT_ID` (or `FIREBASE_PROJECT_ID`)
  - `P_FCM_CLIENT_EMAIL` (or `FIREBASE_CLIENT_EMAIL`)
  - `P_FCM_PRIVATE_KEY` (or `FIREBASE_PRIVATE_KEY`) — ensure `\n` in the env are converted to new lines

El código prefiere `P_FCM_*` y, si existen, usa `FIREBASE_*` como respaldo.

## Seguridad

- Todas las rutas requieren autenticación vía `verifyToken` (JWT extraído por middleware).
- Las rutas de administración requieren además `authorizeModules('notifications')`.

## API REST

Prefijo base: `/{API_VERSION}` (ver `src/app.ts`).

### Grupos

- POST `/groups`
  - Crear un nuevo grupo
  - Body: `{ title: string, description?: string, users?: string[] }`
- GET `/groups`
  - Listar grupos con paginación/búsqueda
  - Query: `page`, `size`, `search`
- GET `/groups/:id`
  - Obtener un grupo por id
- PATCH `/groups/:id`
  - Actualizar grupo (misma forma que create)
- DELETE `/groups/:id`
  - Eliminar grupo

Todos los endpoints de grupos requieren `verifyToken` + `authorizeModules('notifications')`.

### Notificaciones (Campañas)

- POST `/notifications-v2`
  - Crear una campaña
  - Body:
    ```json
    {
      "audience": "USER", // USER | ADMIN (default USER)
      "type": "EMAIL", // MOBILE | EMAIL | INTERNAL | SMS
      "infoType": "NEUTRAL", // NEUTRAL | SUCCESS | WARNING | ERROR | BAN (default NEUTRAL)
      "title": "Hello {{name}}",
      "description": "Your document: {{document}}",
      "imageUrl": "https://...", // optional
      "link": "https://...", // optional
      "users": ["<userId>"], // optional
      "group": "<groupId>", // optional
      "sendAt": "2025-09-25T17:00:00-04:00" // optional, server time
    }
    ```
  - Envío inmediato si `sendAt` no existe o es pasado. Si `sendAt` está en el futuro, la campaña queda `scheduled` y será procesada por el scheduler.

- POST `/notifications-v2/:id/send`
  - Forzar envío inmediato de una campaña específica

- POST `/notifications-v2/:id/cancel`
  - Cancelar una campaña en estado `draft` o `scheduled`

- GET `/notifications-v2`
  - Listar campañas (paginado)
  - Query: `status`, `from`, `to`, `page`, `size`, `infoType`

- GET `/notifications-v2/deliveries`
  - Listar entregas (`NotificationUsers`)
  - Cada fila incluye `recipientType` (USER|ADMIN), `userId`/`adminId` e info básica del `recipient`
  - Query: `campaignId`, `status`, `from`, `to`, `page`, `size`, `infoType`
  - Respuesta `200 OK`:
    ```json
    {
      "success": true,
      "message": "Deliveries retrieved",
      "data": {
        "data": [
          {
            "_id": "665e3e2f2a9bd8c4b2caaaaa",
            "campaignId": "665e3e2f2a9bd8c4b2cbbbb",
            "recipientType": "USER",
            "type": "EMAIL",
            "infoType": "NEUTRAL",
            "title": "Hola Juan",
            "description": "Tu documento es V12345678",
            "imageUrl": null,
            "link": "https://example.com/action",
            "userId": "665e3e2f2a9bd8c4b2c11111",
            "adminId": null,
            "status": "sent",
            "readAt": null,
            "createdAt": "2025-09-25T16:10:00.000Z"
          }
        ],
        "pageInfo": [{ "totalRecords": 42 }]
      }
    }
    ```

- GET `/notifications-v2/{id}/read-count`
  - Obtener la cantidad de notificaciones leídas de una campaña
  - Respuesta `200 OK`:
    ```json
    {
      "success": true,
      "message": "Read count retrieved",
      "data": { "readCount": 10 }
    }
    ```

Los endpoints de campañas requieren `verifyToken` + `authorizeModules('notifications')`.

### Bandeja del Usuario

- GET `/notifications-v2/me`
  - Listar las notificaciones del usuario autenticado (`NotificationUsers`).
  - Aplica a Clientes y Administradores (según el principal presente en el JWT).
  - Query: `status`, `from`, `to`, `page`, `size`, `infoType`
  - Respuesta `200 OK`:
    ```json
    {
      "success": true,
      "message": "Notifications retrieved",
      "data": {
        "data": [
          {
            "_id": "665e3e2f2a9bd8c4b2caaaaa",
            "campaignId": "665e3e2f2a9bd8c4b2cbbbb",
            "recipientType": "USER",
            "type": "EMAIL",
            "infoType": "NEUTRAL",
            "title": "Hola Juan",
            "description": "Tu documento es V12345678",
            "imageUrl": null,
            "link": "https://example.com/action",
            "userId": "665e3e2f2a9bd8c4b2c11111",
            "adminId": null,
            "status": "sent",
            "readAt": null,
            "createdAt": "2025-09-25T16:10:00.000Z"
          }
        ],
        "pageInfo": [{ "totalRecords": 42 }],
        "unreadCount": 5
      }
    }
    ```
- POST `/notifications-v2/me/mark-as-read`
  - Marca como leídas las notificaciones del propio usuario por sus ids.
  - Aplica a Clientes y Administradores (cualquier usuario autenticado).
  - Body:
    ```json
    { "ids": ["<notificationUserId>"] }
    ```
  - Validación: todos los `ids` deben ser `ObjectId` válidos; de lo contrario `400 Bad Request` con `{ "success": false, "message": "Invalid ids" }`.
  - Respuesta `200 OK`:
    ```json
    {
      "success": true,
      "message": "Notifications marked as read",
      "data": { "modified": 3 }
    }
    ```

Estos endpoints requieren solo `verifyToken`.

## Flujo de Estados

- Campaña: `draft` → `processing` → `sent` (o `failed`) / `cancelled`
- Entrega: `queued` → `sent` (o `failed`) → `read`

## Programación (Scheduling)

- Un scheduler ligero corre cada 60 segundos (`src/services/scheduler.ts`).
- Toma campañas con `status = scheduled` y `sendAt <= ahora` y las procesa.
- Se inicia en `src/index.ts` vía `startNotificationScheduler()`.

## Des-duplicación

Cuando una campaña tiene `users` y `group`, los destinatarios se combinan y se des-duplican por id para evitar envíos duplicados.

## Canales Internos vs Externos

- `INTERNAL` solo crea entradas en `NotificationUsers` (sin email/SMS/push).
- `EMAIL` usa Nodemailer (`src/common/mailHelper.ts`).
- `SMS` usa Twilio (`src/common/messageHelper.ts`).
- `MOBILE` usa Firebase Admin SDK (`src/common/pushHelper.ts`).

Para tokens MOBILE y endpoints de Clientes/Admins, ver `README-fcm-tokens.md`.

## Notas

- El flujo legado en `src/controllers/notificationController.ts` y `src/routes/notificationRoutes.ts` se mantiene por ahora.
- Este módulo está escrito en TypeScript y usa MongoDB vía Mongoose.

## Crear una campaña desde código (programático)

Puedes crear y/o enviar una campaña desde cualquier parte del código importando el modelo y el servicio.

```ts
// Ejemplo en TypeScript
import { createAndSendCampaign } from "./src/services/notificationService";

// 1) Crear la campaña (puede apuntar a usuarios o un grupo)
const notif = await createAndSendCampaign({
  audience: "USER", // USER | ADMIN
  type: "EMAIL", // MOBILE | EMAIL | INTERNAL | SMS
  title: "Hola {{name}}",
  description: "Tu documento es {{document}}",
  imageUrl: null,
  link: null,
  users: ["665e3e2f2a9bd8c4b2c11111"], // o usa 'group'
  group: null,
  sendAt: null, // si es futuro, el scheduler la procesará
  status: "draft",
});
```

Notas:

- `sendCampaign(id)` resuelve los destinatarios y crea entradas en `NotificationUsers`, enviando por el canal configurado.
- Si usas `sendAt` en el futuro, el scheduler la moverá de `scheduled` a `processing/sent` cuando corresponda.
