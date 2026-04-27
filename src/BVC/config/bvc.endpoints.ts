export const BVC_ENDPOINTS = {
  LOOKUP: {
    SINGULAR_TX: "/getSingularTx",
  },
  VALIDATION: {
    PAGO_MOVIL: "/verifyP2C",
  },
  TRANSACTION: {
    IMMEDIATE: {
      DEBIT: {
        DEBIT_REQUEST: "/cce/debit",
        TOKEN_REQUEST: "/cce/debit/token",
      },
      CREDIT: "/cce/credit",
    },
  },
} as const;
