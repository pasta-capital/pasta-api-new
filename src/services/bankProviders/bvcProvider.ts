export const bvcProvider = {
  immediateCredit: async (data: any) => {
    // Logic unique to BVC
    console.log("Processing BVC Credit");
  },
  debitRequest: async () => {
    return {
      success: false,
      message: "Solicitud de OTP no soportada para este banco.",
    };
  },
  debitConfirm: async () => {
    return {
      success: false,
      message: "Confirmación de débito no soportada para este banco.",
      code: "payment_error",
    };
  },
  confirmDebit: async (data: any) => {
    // Logic for OTP or direct debit
  },
  checkStatus: async (ref: string) => {
    // Logic to poll their API
  },
  checkStatusMobilePayment: async () => {
    return {
      success: false,
      message: "Consulta de pago móvil no soportada para este banco.",
    };
  },
};
