export default [
  {
    key: "app-active",
    description: "Indica si la aplicación está activa o no",
    value: true,
    type: "boolean",
  },
  {
    key: "paid-on-time-points",
    description: "Puntos ganados por pagar a tiempo",
    value: 20,
    type: "number",
  },
  {
    key: "paid-late-points",
    description: "Puntos perdidos por pagar tarde",
    value: 15,
    type: "number",
  },
  {
    key: "ignore-payment-exists",
    description: "Booleano para ignorar o no las transacciones ya registradas",
    value: false,
    type: "boolean",
  },
  {
    key: "agile-check-lists",
    description: "Listas de verificación de Agilecheck",
    value: [1, 3, 5, 10, 13, 14],
    type: "array",
  },
  {
    key: "credit-active",
    description:
      "Indica si el proceso de creación de operaciones de crédito está activo o no",
    value: true,
    type: "boolean",
  },
  {
    key: "min-available-balance",
    description:
      "Monto mínimo de saldo disponible para crear operaciones de crédito",
    value: 100,
    type: "number",
  },
  {
    key: "commission-mobile",
    description: "Comisión por pago móvil",
    value: 1.5,
    type: "number",
  },
  {
    key: "commission-debit",
    description: "Comisión por débito OTP",
    value: 2,
    type: "number",
  },
  {
    key: "commission-credit",
    description: "Comisión por crédito inmediato",
    value: 0.3,
    type: "number",
  },
  {
    key: "commission-domiciliation",
    description: "Comisión por domiciliación bancaria",
    value: 0.6,
    type: "number",
  },
  {
    key: "annual-interest",
    description: "Interés anual para las operaciones",
    value: 60,
    type: "number",
  },
  {
    key: "upcoming-payment-notification-days",
    description:
      "Días antes del vencimiento para enviar notificaciones de cuotas próximas",
    value: [7, 3, 1, 0],
    type: "array",
  },
  {
    key: "active-bank-code",
    description: "Código del banco activo para desembolso y recibo de pagos",
    value: "0172",
    type: "string",
  },
];
