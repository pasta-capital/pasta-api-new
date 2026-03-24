#

de la API

Documentación de flujos y endpoints para Cliente y Administrador.

---

## Índice

- [Flujos Cliente](#flujos-cliente)
- [Flujos Administrador](#flujos-administrador)

---

## Flujos Cliente

### Login

| Acción         | Método | Endpoint       |
| -------------- | ------ | -------------- |
| Iniciar sesión | `POST` | `/users/login` |

---

### Olvido de clave

| Acción          | Método | Endpoint                 |
| --------------- | ------ | ------------------------ |
| Solicitud       | `POST` | `/users/forgot-password` |
| Recuperar clave | `POST` | `/users/reset-password`  |

---

### Registro

| Acción                         | Método | Endpoint                            |
| ------------------------------ | ------ | ----------------------------------- |
| Validar documento              | `POST` | `/users/validate-document`          |
| Enviar código por email        | `POST` | `/users/send-register-token`        |
| Validar/iniciar domiciliación  | `POST` | `/users/pre-register-domiciliation` |
| Obtener términos y condiciones | `GET`  | `/users/terms-and-conditions`       |
| Completar registro             | `POST` | `/users/register`                   |

---

### Home

| Acción                                    | Método | Endpoint               |
| ----------------------------------------- | ------ | ---------------------- |
| Deudas pendientes/próximas cuotas a pagar | `GET`  | `/operation/payments`  |
| Límite disponible                         | `GET`  | `/v1/users`            |
| Notificaciones no leídas                  | `GET`  | `/notifications-v2/me` |

---

### Perfil

| Acción                          | Método | Endpoint                              |
| ------------------------------- | ------ | ------------------------------------- |
| Obtener datos de perfil         | `GET`  | `/users/profile`                      |
| Editar perfil (solicitud)       | `POST` | `/users/edit-profile`                 |
| Editar perfil (confirmación)    | `POST` | `/users/edit-profile-confirmation`    |
| Cambiar clave (solicitud)       | `POST` | `/users/change-password`              |
| Cambiar clave (confirmación)    | `POST` | `/users/change-password-confirmation` |
| Obtener términos y condiciones  | `GET`  | `/users/terms-and-conditions`         |
| Obtener preguntas frecuentes    | `GET`  | `/users/frequent-questions`           |
| Configuración de notificaciones | `POST` | `/users/notifications-config`         |
| Borrar cuenta pasta             | `POST` | `/users/unregister`                   |

---

### Historial

| Acción                 | Método | Endpoint                  |
| ---------------------- | ------ | ------------------------- |
| Listado de deudas      | `GET`  | `/operation/payments`     |
| Listado de movimientos | `GET`  | `/operation/movements`    |
| Detalle de movimiento  | `GET`  | `/operation/details/{ID}` |

---

### Pedir dinero

| Acción                                                                                                           | Método | Endpoint             |
| ---------------------------------------------------------------------------------------------------------------- | ------ | -------------------- |
| Solicitud (Confirmar pedido después de ingresar monto y cantidad de cuotas)                                      | `POST` | `/operation/request` |
| Listado de cuentas                                                                                               | `GET`  | `/accounts`          |
| Confirmación de pedido (Confirmar pedido luego de que se muestre resumen de la operación e ingresado comentario) | `POST` | `/operation/confirm` |

---

### Pagar cuota

| Acción                                                                                     | Método | Endpoint                           |
| ------------------------------------------------------------------------------------------ | ------ | ---------------------------------- |
| Solicitud (luego de seleccionar las cuotas a pagar)                                        | `POST` | `/operation/pay-debt`              |
| Envío de clave OTP (en caso de seleccionar débito directo)                                 | `POST` | `/operation/request-otp`           |
| Confirmación de pago (luego de colocar datos de pago móvil o código otp en caso de débito) | `POST` | `/operation/pay-debt-confirmation` |

---

## Flujos Administrador

### Login

| Acción                                      | Método | Endpoint                       |
| ------------------------------------------- | ------ | ------------------------------ |
| Inicio de sesión                            | `POST` | `/admin/login`                 |
| Olvido de clave                             | `POST` | `/admin/users/forgot-password` |
| Recuperación de clave/Confirmación de email | `POST` | `/admin/users/confirm-email`   |

---

### Dashboard

| Acción                             | Método | Endpoint                                   |
| ---------------------------------- | ------ | ------------------------------------------ |
| Total de clientes                  | `GET`  | `/users/statistics`                        |
| Montos                             | `GET`  | `/dashboard/liquidated-amounts-indicator`  |
| Historia de Clientes en el tiempo  | `GET`  | `/dashboard/customer-history`              |
| Historia de Montos en el tiempo    | `GET`  | `/dashboard/amount-history`                |
| Historia de Morosidad              | `GET`  | `/dashboard/arrears-history`               |
| Días promedio de pago de cuotas    | `GET`  | `/dashboard/payment-delay-history`         |
| Historial de pagos y liquidaciones | `GET`  | `/dashboard/payments-liquidations-history` |
| Clientes Recurrentes               | `GET`  | `/dashboard/recurring-clients-indicator`   |

---

### Configuración — Roles

| Acción   | Método   | Endpoint      |
| -------- | -------- | ------------- |
| Listar   | `GET`    | `/roles`      |
| Detalle  | `GET`    | `/roles/{ID}` |
| Crear    | `POST`   | `/roles`      |
| Editar   | `PUT`    | `/roles/{ID}` |
| Eliminar | `DELETE` | `/roles/{ID}` |

---

### Configuración — Usuarios

| Acción                     | Método  | Endpoint            |
| -------------------------- | ------- | ------------------- |
| Listar                     | `GET`   | `/admin/users`      |
| Detalle                    | `GET`   | `/admin/users/{ID}` |
| Crear                      | `POST`  | `/admin/create`     |
| Editar, activar/desactivar | `PATCH` | `/admin/users/{ID}` |

---

### Configuración — Credit Score

| Acción                | Método | Endpoint        |
| --------------------- | ------ | --------------- |
| Obtener configuración | `GET`  | `/credit-score` |
| Editar configuración  | `PUT`  | `/credit-score` |

---

### Clientes

| Acción         | Método  | Endpoint                          |
| -------------- | ------- | --------------------------------- |
| Listado        | `GET`   | `/users/get-all`                  |
| Indicadores    | `GET`   | `/users/statistics`               |
| Detalle        | `GET`   | `/users/{ID}`                     |
| Cuentas        | `GET`   | `/users/{ID}/accounts`            |
| Documentos     | `GET`   | `/users/{ID}/documents`           |
| Perfil Riesgo  | `GET`   | `/agile-check/perfil-riesgo/{ID}` |
| Editar cliente | `PATCH` | `/users/{ID}`                     |

---

### Operaciones — Solicitudes de crédito

| Acción  | Método | Endpoint              |
| ------- | ------ | --------------------- |
| Listado | `GET`  | `/operation/all`      |
| Detalle | `GET`  | `/operation/get/{ID}` |

---

### Operaciones — Cuotas

| Acción  | Método | Endpoint                  |
| ------- | ------ | ------------------------- |
| Listado | `GET`  | `/operation/all-payments` |

---

### Operaciones — Pagos

| Acción  | Método | Endpoint                   |
| ------- | ------ | -------------------------- |
| Listado | `GET`  | `/operation/payments-list` |
| Detalle | `GET`  | `/operation/payment/{ID}`  |

---

### Histórico tasa BCV

| Acción  | Método | Endpoint        |
| ------- | ------ | --------------- |
| Listado | `GET`  | `/rate/history` |

---

### Grupos

| Acción   | Método   | Endpoint       |
| -------- | -------- | -------------- |
| Listado  | `GET`    | `/groups`      |
| Crear    | `POST`   | `/groups`      |
| Detalle  | `GET`    | `/groups/{ID}` |
| Editar   | `PATCH`  | `/groups/{ID}` |
| Eliminar | `DELETE` | `/groups/{ID}` |

---

### Notificaciones

| Acción                        | Método   | Endpoint                                                 |
| ----------------------------- | -------- | -------------------------------------------------------- |
| Listar campañas               | `GET`    | `/notifications-v2`                                      |
| Crear campaña                 | `POST`   | `/notifications-v2`                                      |
| Entregas                      | `GET`    | `/notifications-v2/deliveries`                           |
| Listar Configuración de días  | `GET`    | `/notifications-v2/settings/upcoming-payment-days`       |
| Crear configuración de día    | `POST`   | `/notifications-v2/settings/upcoming-payment-days`       |
| Eliminar configuración de día | `DELETE` | `/notifications-v2/settings/upcoming-payment-days/{day}` |
