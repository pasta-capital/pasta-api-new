# Integración de Tokens FCM (Push)

Este documento explica cómo registrar, desregistrar y usar tokens de dispositivo de Firebase Cloud Messaging (FCM) tanto para Usuarios (app móvil) como para Administradores.

## Resumen

- Usuarios y Administradores pueden asociar múltiples tokens FCM (uno por dispositivo) para recibir notificaciones push.
- Los tokens se almacenan en una colección dedicada `PushToken` con `status`:
  - Esquema: `token`, `ownerType: USER|ADMIN`, `userId|adminId`, `status: active|inactive|revoked`, `lastUsedAt`.
  - Compatibilidad: se siguen actualizando `User.pushTokens`/`User.pushToken` y `Admin.pushTokens`/`Admin.pushToken` para no romper clientes antiguos.
- Las campañas con tipo `MOBILE` leen los tokens activos desde `PushToken` y marcan como `inactive` los tokens inválidos devueltos por FCM.

## Requisitos Previos

- Habilita FCM y configura credenciales vía variables de entorno en `.env`:
  - `FIREBASE_FCM_ENABLED=true`
  - `FIREBASE_PROJECT_ID=...`
  - `FIREBASE_CLIENT_EMAIL=...`
  - `FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` (escapar saltos de línea con `\n`)
  - O define `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`

Para más detalles, ver `src/common/pushHelper.ts`, `src/models/PushToken.ts` y `src/config/env.config.ts`.

## Endpoints de Usuario (App Móvil)

Todos los endpoints requieren un JWT de usuario válido en el header `x-access-token`.

- Suscribir un token
  - `POST /{version}/users/subscribe-push`
  - Body:
    ```json
    { "token": "fcm_device_token" }
    ```
  - Respuesta:
    ```json
    {
      "success": true,
      "message": "Push token subscribed successfully",
      "data": { "tokens": 2 }
    }
    ```

- Desuscribir un token
  - `POST /{version}/users/unsubscribe-push`
  - Body:
    ```json
    { "token": "fcm_device_token" }
    ```
  - Response:
    ```json
    {
      "success": true,
      "message": "Push token unsubscribed successfully",
      "data": { "tokens": 1 }
    }
    ```

Implementación: `src/controllers/userController.ts` y rutas en `src/routes/userRoutes.ts`.

## Endpoints de Administrador

Todos los endpoints requieren un JWT de administrador válido en el header `x-access-token`.

- Subscribe a token
  - `POST /admin/subscribe-push`
  - Body:
    ```json
    { "token": "fcm_device_token" }
    ```

- Unsubscribe a token
  - `POST /admin/unsubscribe-push`
  - Body:
    ```json
    { "token": "fcm_device_token" }
    ```

Implementación: `src/controllers/adminController.ts` y rutas en `src/routes/adminRoutes.ts`.

## Envío de Campañas MOBILE

- Crea una campaña con `type: "MOBILE"` vía `POST /{version}/notifications-v2`.
- Lógica de entrega (`src/services/notificationService.ts`):
  - Obtiene tokens activos desde `PushToken` por destinatario (USER o ADMIN).
  - Envía push a todos los tokens. Si al menos uno tiene éxito, la entrega se marca como `sent`.
  - Si FCM retorna errores como `registration-token-not-registered` o `invalid-registration-token`, esos tokens se actualizan a `inactive` en `PushToken` y se intenta limpieza de compatibilidad en el perfil.

## Ejemplos cURL

- Suscribir token de usuario

```bash
curl -X POST "${API_URL}/{version}/users/subscribe-push" \
  -H "Content-Type: application/json" \
  -H "x-access-token: <USER_JWT>" \
  -d '{"token":"<FCM_TOKEN>"}'
```

- Desuscribir token de usuario

```bash
curl -X POST "${API_URL}/{version}/users/unsubscribe-push" \
  -H "Content-Type: application/json" \
  -H "x-access-token: <USER_JWT>" \
  -d '{"token":"<FCM_TOKEN>"}'
```

- Suscribir token de administrador

```bash
curl -X POST "${API_URL}/admin/subscribe-push" \
  -H "Content-Type: application/json" \
  -H "x-access-token: <ADMIN_JWT>" \
  -d '{"token":"<FCM_TOKEN>"}'
```

## Notas del Lado del Cliente

- Solicita permiso de notificaciones y obtiene el token de registro FCM al iniciar la app o cuando cambie.
- Re-suscribe siempre después de reinstalar o cuando FCM rote el token.
- Llama a `unsubscribe-push` al cerrar sesión o cuando el dispositivo desactive notificaciones.

## Referencias

- Almacenamiento de tokens: `src/models/PushToken.ts` (principal), `src/models/User.ts`, `src/models/admin.ts` (compatibilidad)
- Flujos de usuarios: `src/controllers/userController.ts`, `src/routes/userRoutes.ts`
- Flujos de admins: `src/controllers/adminController.ts`, `src/routes/adminRoutes.ts`
- Entrega push: `src/common/pushHelper.ts`, `src/services/notificationService.ts`
