import fs, { readFile } from "fs";
import {
  cleanText,
  formatCustomeDate,
  padField,
  padNumber,
} from "../common/helper";
import Subscription from "../models/subscription";
import SubscriptionPayment from "../models/subscriptionPayment";
import PreSubscription from "../models/preSubscription";
import * as env from "../config/env.config";
import path from "path";
import { getRateS } from "./rateService";
import BanescoDomiciliation from "../models/banescoDomiciliation";
import {
  domiciliation,
  getTransactionResult,
  TransactionStatusCode,
} from "./sypagoService";

const filesPath = env.DOMICILIATION_FILE_PATH;
if (!fs.existsSync(filesPath)) {
  fs.mkdirSync(filesPath, { recursive: true });
}

interface RespFileStructure {
  [key: string]: RespFileStructureField[];
}

interface RespFileStructureField {
  name: string;
  start: number;
  length: number;
  type: "string" | "decimal";
}

export const createSubscription = async (
  user: string,
  account: string,
  plan: string,
) => {
  const count = await Subscription.countDocuments();
  const newSubscription = new Subscription({
    user,
    // account,
    plan,
    startDate: new Date(),
    contractNumber: padNumber(count + 1, 8),
  });
  await newSubscription.save();

  return {
    success: true,
    message: "Suscripción creada exitosamente",
    data: newSubscription,
  };
};

/**
 * Procesa el cobro de domiciliación por concepto de membresía al momento del registro.
 *
 * @param {any} user Solicitante del registro.
 * @param {any} diditSession Sesión de verificación de identidad.
 * @param {string} bankCode Código del banco del usuario.
 * @param {string} accountNumber Número de cuenta del usuario.
 * @returns {Promise<{success: boolean, message?: string, code?: string}>}
 */
/**
 * Procesa el cobro de domiciliación previo al registro.
 * Valida el estado de la transacción con SyPago y solo crea la pre-suscripción si el estado es ACCP.
 *
 * @param {string} name Nombre del cliente.
 * @param {string} identification Identificación del cliente (sin tipo de documento).
 * @param {string} bankCode Código del banco.
 * @param {string} accountNumber Número de cuenta.
 * @param {string} identificationType Tipo de identificación (V, E, J, etc.).
 * @returns {Promise<{success: boolean, message?: string, code?: string, data?: any}>}
 */
export const processPreRegistrationDomiciliation = async (
  name: string,
  identification: string,
  bankCode: string,
  accountNumber: string,
  identificationType: string = "V",
) => {
  try {
    // Normalizar identificación (eliminar cualquier letra al principio)
    const normalizedIdentification = identification.replace(/^[A-Za-z]+/, "");

    const rate = await getRateS();
    if (!rate?.usd) {
      return {
        success: false,
        message: "No se pudo obtener la tasa para la domiciliación.",
        code: "rate_not_available",
      };
    }

    const amountUsd = 0.99;
    const amountVef = parseFloat((amountUsd * rate.usd).toFixed(2));

    // Generar un internal_id único basado en timestamp y identificación
    // "internal_id" must be alphanumeric and <= 20 characters
    // Use timestamp (in seconds, base36) + normalized ID end, all alphanumeric, max 20 chars
    const tsBase36 = Math.floor(Date.now() / 1000).toString(36); // short, alphanumeric
    const normIdAlphaNum = normalizedIdentification.replace(
      /[^a-zA-Z0-9]/g,
      "",
    );
    const maxNormIdLen = 20 - tsBase36.length;
    const trimmedNormId = normIdAlphaNum.slice(-maxNormIdLen);
    const internalId = `${tsBase36}${trimmedNormId}`;

    const SypagoDomiciliationBody = {
      internal_id: internalId,
      group_id: "PASTAMEMBRESIA",
      account: {
        bank_code: env.SYPAGO_BANK_ACCOUNT_CODE!,
        type: "CNTA",
        number: env.SYPAGO_BANK_ACCOUNT_NUMBER!,
      },
      amount: {
        amt: amountVef,
        currency: "VES",
      },
      concept: "Cobro por domiciliación",
      notification_urls: {
        web_hook_endpoint: env.SYPAGO_WEBHOOK_URL!,
      },
      receiving_user: {
        name: name,
        document_info: {
          type: identificationType,
          number: normalizedIdentification,
        },
        account: {
          bank_code: bankCode,
          type: "CNTA",
          number: accountNumber,
        },
      },
      domiciliation_data: {
        contract: {
          id: "c2626cf768a89239ae15",
        },
        invoices: [
          {
            id: "c2626cf768a89239ae15",
            amount: {
              amt: amountVef,
              currency: "VES",
            },
          },
        ],
      },
    } as env.SypagoDomiciliationBody;

    console.log(
      `Pre-registration domiciliation request for ${normalizedIdentification}: ${JSON.stringify(SypagoDomiciliationBody)}`,
    );

    const resp = await domiciliation(SypagoDomiciliationBody);
    if (!resp.success) {
      return {
        success: false,
        message: resp.message || "Domiciliation request failed",
        code: "domiciliation_request_failed",
      };
    }
    if (!resp.data?.transaction_id) {
      return {
        success: false,
        message: "No se recibió el transaction_id de la domiciliación.",
        code: "domiciliation_transaction_id_missing",
      };
    }

    // Verificar el estado de la transacción con getTransactionResult
    let transactionResult;
    try {
      transactionResult = await getTransactionResult(resp.data.transaction_id);
    } catch (error) {
      console.error("Error al obtener el resultado de la transacción:", error);
      return {
        success: false,
        message: "No se pudo verificar el estado de la transacción con SyPago.",
        code: "transaction_verification_error",
      };
    }

    // Solo crear la pre-suscripción si el estado es ACCP
    if (
      transactionResult.success &&
      transactionResult.data?.status === TransactionStatusCode.ACCP
    ) {
      const preSubscription = await PreSubscription.create({
        identification: normalizedIdentification,
        name: name,
        bankCode: bankCode,
        accountNumber: accountNumber,
        transactionId: resp.data.transaction_id,
        transactionStatus: transactionResult.data.status,
        transactionRate: rate.usd,
        transactionAmount: amountUsd,
        consumed: false,
        active: true,
      });
      await preSubscription.save();

      return {
        success: true,
        message: "Pre-suscripción creada exitosamente",
        data: {
          preSubscriptionId: preSubscription._id,
          transactionId: resp.data.transaction_id,
        },
      };
    } else {
      // Si el estado no es ACCP, retornar error sin crear pre-suscripción
      return {
        success: false,
        message:
          transactionResult.data?.status === TransactionStatusCode.RJCT
            ? "La transacción fue rechazada por SyPago."
            : "La transacción no fue aceptada por SyPago.",
        code: "transaction_not_accepted",
        data: {
          transactionId: resp.data.transaction_id,
          status: transactionResult.data?.status,
        },
      };
    }
  } catch (error) {
    console.error("Error en el proceso de domiciliación previa:", {
      error,
      identification,
    });
    return {
      success: false,
      message: "Ocurrió un error al procesar la domiciliación previa.",
      code: "domiciliation_process_error",
    };
  }
};

export const processRegistrationDomiciliation = async (
  user: any,
  diditSession: any,
  bankCode: string | undefined,
  accountNumber: string,
) => {
  try {
    const rate = await getRateS();
    if (!rate?.usd) {
      return {
        success: false,
        message: "No se pudo obtener la tasa para la domiciliación.",
        code: "rate_not_available",
      };
    }

    const amountUsd = 0.99;
    const amountVef = parseFloat((amountUsd * rate.usd).toFixed(2));
    const documentType =
      diditSession?.id_verification?.document_number?.[0] ||
      user.identificationType ||
      "V";

    const SypagoDomiciliationBody = {
      internal_id: user._id.toString().slice(-20),
      group_id: "PASTAMEMBRESIA",
      account: {
        bank_code: env.SYPAGO_BANK_ACCOUNT_CODE!,
        type: "CNTA",
        number: env.SYPAGO_BANK_ACCOUNT_NUMBER!,
      },
      amount: {
        amt: amountVef,
        currency: "VES",
      },
      concept: "Cobro por domiciliación",
      notification_urls: {
        web_hook_endpoint: env.SYPAGO_WEBHOOK_URL!,
      },
      receiving_user: {
        name: `${user.name} ${user.lastname}`,
        document_info: {
          type: documentType,
          number: user.document,
        },
        account: {
          bank_code: bankCode,
          type: "CNTA",
          number: accountNumber,
        },
      },
      domiciliation_data: {
        contract: {
          id: "c2626cf768a89239ae15",
        },
        invoices: [
          {
            id: "c2626cf768a89239ae15",
            amount: {
              amt: amountVef,
              currency: "VES",
            },
          },
        ],
      },
    } as env.SypagoDomiciliationBody;

    console.log(
      `Domiciliation request for user ${user._id}: ${JSON.stringify(SypagoDomiciliationBody)}`,
    );

    const resp = await domiciliation(SypagoDomiciliationBody);
    if (!resp.success) {
      return {
        success: false,
        message: resp.message || "Domiciliation request failed",
        code: "domiciliation_request_failed",
      };
    }
    if (!resp.data?.transaction_id) {
      return {
        success: false,
        message: "No se recibió el transaction_id de la domiciliación.",
        code: "domiciliation_transaction_id_missing",
      };
    }

    const subscription = await Subscription.create({
      user: user._id,
      transactionId: resp.data.transaction_id,
      transactionRate: rate.usd,
      transactionAmount: amountUsd,
    });
    await subscription.save();

    return { success: true };
  } catch (error) {
    console.error("Error en el pago de domiciliación durante el registro:", {
      error,
      userId: user?._id,
    });
    return {
      success: false,
      message: "Ocurrió un error al procesar el pago de domiciliación.",
      code: "domiciliation_process_error",
    };
  }
};

/**
 * Busca una pre-suscripción activa y no consumida por identificación.
 *
 * @param {string} identification Identificación del cliente (normalizada).
 * @returns {Promise<{success: boolean, message?: string, code?: string, data?: any}>}
 */
export const getPreSubscription = async (identification: string) => {
  // Normalizar identificación
  const normalizedIdentification = identification.replace(/^[A-Za-z]+/, "");

  const preSubscription = await PreSubscription.findOne({
    identification: normalizedIdentification,
    consumed: false,
    active: true,
  });

  if (!preSubscription) {
    return {
      success: false,
      message: "No existe una pre-suscripción válida para esta identificación",
      code: "pre_subscription_not_found",
    };
  }

  return {
    success: true,
    message: "Pre-suscripción encontrada",
    data: preSubscription,
  };
};

/**
 * Marca una pre-suscripción como consumida.
 *
 * @param {string} preSubscriptionId ID de la pre-suscripción.
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export const consumePreSubscription = async (preSubscriptionId: string) => {
  try {
    const preSubscription = await PreSubscription.findById(preSubscriptionId);
    if (!preSubscription) {
      return {
        success: false,
        message: "Pre-suscripción no encontrada",
      };
    }

    preSubscription.consumed = true;
    await preSubscription.save();

    return {
      success: true,
      message: "Pre-suscripción consumida exitosamente",
    };
  } catch (error) {
    console.error("Error al consumir pre-suscripción:", error);
    return {
      success: false,
      message: "Error al consumir la pre-suscripción",
    };
  }
};

export const getSubscription = async (user: string) => {
  const subscription = await Subscription.findOne({ user });
  if (!subscription) {
    return {
      success: false,
      message: "No estás suscrito",
      code: "not_subscribed",
    };
  }
  return {
    success: true,
    message: "Suscripción obtenida exitosamente",
    data: subscription,
  };
};

export const createSubscriptionPayments = async (
  user: string,
  count: number,
) => {
  const subscription = await Subscription.findOne({ user });
  if (!subscription) {
    return {
      success: false,
      message: "No estás suscrito",
      code: "not_subscribed",
    };
  }

  const newSubscriptionPayments = [];

  for (let i = 0; i < count; i++) {
    const paymentDate = subscription.startDate;
    paymentDate.setMonth(paymentDate.getMonth() + i);
    const newSubscriptionPayment = new SubscriptionPayment({
      user,
      amount: 1,
      currency: "USD",
      paymentDate: paymentDate,
      status: "pending",
      details: "Pago de suscripción",
    });
    await newSubscriptionPayment.save();
    newSubscriptionPayments.push(newSubscriptionPayment);
  }

  return {
    success: true,
    message: "Pagos de suscripción creados exitosamente",
    data: newSubscriptionPayments,
  };
};

export const generateDomiciliationFile = async (
  dateStr: string | undefined,
) => {
  const today = dateStr ? new Date(dateStr) : new Date();
  const todayDay = today.getUTCDate();
  const todayMonth = today.getUTCMonth() + 1;
  const lastDay = new Date(today.getUTCFullYear(), todayMonth, 0).getUTCDate();

  const subscriptions = await Subscription.aggregate([
    {
      $addFields: {
        createdDay: {
          $dayOfMonth: "$createdAt",
        },
        createdMonth: {
          $month: "$createdAt",
        },
      },
    },
    {
      $match: {
        $expr: {
          $and: [
            { active: true },
            {
              $or: [
                // Si plan es mensual
                {
                  $and: [
                    {
                      $eq: ["$plan", "monthly"],
                    },
                    {
                      $or: [
                        {
                          $eq: ["$createdDay", todayDay],
                        },
                        {
                          $and: [
                            {
                              $gt: ["$createdDay", lastDay],
                            },
                            {
                              $eq: [todayDay, lastDay],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                // Si plan es anual
                {
                  $and: [
                    { $eq: ["$plan", "annually"] },
                    { $eq: ["$createdMonth", todayMonth] },
                    {
                      $or: [
                        {
                          $eq: ["$createdDay", todayDay],
                        },
                        {
                          $and: [
                            {
                              $gt: ["$createdDay", lastDay],
                            },
                            {
                              $eq: [todayDay, lastDay],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $lookup: {
        from: "Account",
        localField: "account",
        foreignField: "_id",
        as: "account",
      },
    },
    {
      $unwind: "$account",
    },
    {
      $lookup: {
        from: "Bank",
        localField: "account.bank",
        foreignField: "_id",
        as: "account.bank",
      },
    },
    {
      $unwind: {
        path: "$account.bank",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "User",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        _id: 0,
        "user._id": 1,
        "user.name": 1,
        "user.lastname": 1,
        "user.email": 1,
        "user.document": 1,
        "user.identificationType": 1,
        "account.bank.name": 1,
        "account.number": 1,
        "account.type": 1,
        createdAt: 1,
        plan: 1,
        startDate: 1,
        active: 1,
        contractNumber: 1,
      },
    },
  ]);

  if (subscriptions.length === 0) {
    return {
      success: false,
      message:
        "No se encontraron suscripciones activas a cobrar en la fecha actual",
      code: "not_found",
    };
  }

  const rate = await getRateS();
  const rateUsd = parseFloat(rate!.usd.toFixed(2));

  const subscriptionPayments = [];
  const receiptCount = await SubscriptionPayment.countDocuments();
  for (let i = 0; i < subscriptions.length; i++) {
    const subscriptionPayment = {
      user: subscriptions[i].user._id,
      amount: (subscriptions[i].plan === "monthly" ? 1 : 12) * rateUsd,
      currency: "VEF",
      paymentDate: today,
      status: "pending",
      details: "Pago de suscripción",
      receiptId: padNumber(receiptCount + i + 1, 8),
      account: subscriptions[i].account.number,
      fullName: cleanText(
        subscriptions[i].user.name + " " + subscriptions[i].user.lastname,
      ),
      identification:
        subscriptions[i].user.identificationType +
        subscriptions[i].user.document,
      contractNumber: subscriptions[i].contractNumber,
    };
    subscriptionPayments.push(subscriptionPayment);
  }

  const savedSubscriptionPayments =
    await SubscriptionPayment.insertMany(subscriptionPayments);

  const registroControl = {
    tipoRegistro: "HDR",
    asociadoComercial: "BANESCO",
    estandarEdifact: "E",
    versionEdifact: "D  96A",
    tipoDocumento: "DIRDEB",
    produccion: "P",
  };

  const banescoDomiciliationCount = await BanescoDomiciliation.countDocuments();

  const registroEncabezado = {
    tipoRegistro: "01",
    tipoTransaccion: "SUB",
    condicionOrdenPago: "9",
    numeroOrdenPago: padNumber(banescoDomiciliationCount + 1, 8),
    fechaCreacionOrdenPago: formatCustomeDate(new Date()),
  };

  const registroDebito = subscriptionPayments.map((subscriptionPayment) => ({
    tipoRegistro: "03",
    numeroRecibo: subscriptionPayment.receiptId,
    montoCobro: subscriptionPayment.amount,
    moneda: "VES",
    numeroCuenta: subscriptionPayment.account,
    banco: "BANPXLDKA",
    cedula: subscriptionPayment.identification,
    nombreCliente: subscriptionPayment.fullName,
    campoLibre: "",
    numeroContrato: subscriptionPayment.contractNumber,
    fechaVencimiento: "",
  }));

  const registroTotales = {
    tipoRegistro: "04",
    totalCreditos: 0,
    totalDebitos: registroDebito.length,
    montoTotalCobro: registroDebito.reduce(
      (acc, registro) => acc + registro.montoCobro,
      0,
    ),
  };

  let fileContent = "";
  fileContent += padField(registroControl.tipoRegistro, 3, "AN");
  fileContent += padField(registroControl.asociadoComercial, 15, "AN");
  fileContent += padField(registroControl.estandarEdifact, 1, "AN");
  fileContent += padField(registroControl.versionEdifact, 6, "AN");
  fileContent += padField(registroControl.tipoDocumento, 6, "AN");
  fileContent += padField(registroControl.produccion, 1, "AN");

  fileContent += "\r\n";

  fileContent += padField(registroEncabezado.tipoRegistro, 2, "NA");
  fileContent += padField(registroEncabezado.tipoTransaccion, 35, "AN");
  fileContent += padField(registroEncabezado.condicionOrdenPago, 3, "AN");
  fileContent += padField(registroEncabezado.numeroOrdenPago, 35, "AN");
  fileContent += padField(registroEncabezado.fechaCreacionOrdenPago, 14, "AN");

  fileContent += "\r\n";

  for (const item of registroDebito) {
    fileContent += padField(item.tipoRegistro, 2, "NA");
    fileContent += padField(item.numeroRecibo, 30, "NA");
    fileContent += padField(item.montoCobro, 15, "N", "right");
    fileContent += padField(item.moneda, 3, "AN");
    fileContent += padField(item.numeroCuenta, 30, "AN");
    fileContent += padField(item.banco, 11, "AN");
    fileContent += padField(item.cedula, 17, "AN");
    fileContent += padField(item.nombreCliente, 35, "AN");
    fileContent += padField(item.campoLibre, 3, "AN");
    fileContent += padField(item.numeroContrato, 35, "AN");
    fileContent += padField(item.fechaVencimiento, 6, "AN");
    fileContent += "\r\n";
  }

  fileContent += registroTotales.tipoRegistro;
  fileContent += padField(registroTotales.totalCreditos, 15, "N", "right");
  fileContent += padField(registroTotales.totalDebitos, 15, "N", "right");
  fileContent += padField(registroTotales.montoTotalCobro, 15, "N", "right");
  fileContent += "\r\n";

  const timestamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13); // e.g., 20250714_0945
  const fileName = `domiciliacion-debito-banesco-${timestamp}.txt`;
  const filePath = path.join(filesPath, fileName);
  try {
    fs.writeFileSync(filePath, fileContent);

    await BanescoDomiciliation.create({
      orderId: padNumber(banescoDomiciliationCount + 1, 8),
      fileName,
      status: "pending",
      payments: savedSubscriptionPayments.map((c) => c._id),
    });

    return {
      success: true,
      message: "Archivo generado exitosamente",
      data: filePath,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error al generar el archivo",
      code: "error",
      error,
    };
  }
};

export const readDomiciliationFileResp = async () => {
  const fileName = "cobros-resp.txt";
  const filePath = path.join(filesPath, fileName);

  const structures = {
    "010": [
      { name: "tipoRegistro", start: 0, length: 3, type: "string" },
      { name: "numeroReferencia", start: 3, length: 35, type: "string" },
      { name: "fechaRegistro", start: 38, length: 14, type: "string" },
      { name: "tipoOrden", start: 52, length: 3, type: "string" },
      { name: "numeroOrden", start: 55, length: 35, type: "string" },
      { name: "bancoEmisorCode", start: 90, length: 11, type: "string" },
      {
        name: "bancoEmisorDescription",
        start: 101,
        length: 70,
        type: "string",
      },
      { name: "EmpresaRif", start: 171, length: 17, type: "string" },
      { name: "EmpresaNombre", start: 188, length: 70, type: "string" },
    ],
    "02": [
      { name: "tipoRegistro", start: 0, length: 2, type: "string" },
      { name: "indicadorInformacion", start: 2, length: 1, type: "string" },
      { name: "referenciaAsociado", start: 3, length: 35, type: "string" },
      { name: "numeroContrato", start: 38, length: 35, type: "string" },
      { name: "fechaAplicacion", start: 73, length: 8, type: "string" },
      { name: "montoTotal", start: 81, length: 15, type: "decimal" }, // Usar un tipo 'decimal'
      { name: "monedaCod", start: 96, length: 3, type: "string" },
      { name: "cedulaRif", start: 99, length: 17, type: "string" },
      { name: "numeroCuenta", start: 116, length: 35, type: "string" },
      { name: "bancoBeneficiarioCod", start: 151, length: 11, type: "string" },
      { name: "bancoBeneficiarioDesc", start: 162, length: 70, type: "string" },
      { name: "codigoAgencia", start: 232, length: 3, type: "string" },
      { name: "nombreBeneficiario", start: 235, length: 70, type: "string" },
      { name: "fechaVcto", start: 305, length: 6, type: "string" },
    ],
    "030": [
      { name: "tipoRegistro", start: 0, length: 3, type: "string" },
      { name: "statusCod", start: 3, length: 3, type: "string" },
      { name: "statusDesc", start: 6, length: 70, type: "string" },
    ],
  } as RespFileStructure;

  try {
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        message: "No se encontró el archivo",
        code: "not_found",
      };
    }

    const fileContent = fs.readFileSync(filePath, "utf8");
    const lines = fileContent.split("\r\n").filter((line) => line !== "");

    const parseData = {
      encabezado: null,
      detalles: [] as any,
    };

    let i = 0;

    while (i < lines.length) {
      const currentLine = lines[i];
      let recordType = null;

      if (currentLine.substring(0, 3) === "010" && currentLine.length === 258) {
        recordType = "010";
      } else if (
        currentLine.substring(0, 2) === "02" &&
        currentLine.length === 311
      ) {
        recordType = "02";
      } else if (
        currentLine.substring(0, 3) === "030" &&
        currentLine.length === 76
      ) {
        recordType = "03";
      } else {
        console.warn(
          `Línea ${
            i + 1
          } no coincide con un tipo de registro conocido por prefijo/longitud: "${currentLine}" (Longitud: ${
            currentLine.length
          })`,
        );
        i++;
        continue;
      }

      const structure = structures[recordType];
      if (!structure) {
        console.warn(
          `No se encontró estructura para el tipo de registro: ${recordType}`,
        );
        i++;
        continue;
      }

      const record = {} as any;

      structure.forEach((field) => {
        let fieldValue = currentLine.substring(
          field.start,
          field.start + field.length,
        );

        if (field.type === "decimal") {
          const intPart = fieldValue.substring(0, fieldValue.length - 2);
          const decimalPart = fieldValue.substring(fieldValue.length - 2);
          record[field.name] = parseFloat(`${intPart}.${decimalPart}`);
        } else {
          record[field.name] = fieldValue.trim();
        }
      });

      if (record.tipoRegistro === "010") {
        parseData.encabezado = record;
        i++;
      } else if (record.tipoRegistro === "02") {
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (nextLine.substring(0, 3) === "030") {
            const statusRecord = {} as any;
            structures["030"].forEach((field) => {
              let fieldValue = nextLine.substring(
                field.start,
                field.start + field.length,
              );
              statusRecord[field.name] = fieldValue.trim();
            });
            parseData.detalles.push({ ...record, status: statusRecord });
            i += 2;
          } else {
            console.warn(
              `Línea ${
                i + 2
              } (después de 02) no es un registro 030 válido. Salto.`,
            );
            parseData.detalles.push({ ...record, status: null });
            i++;
          }
        } else {
          console.warn(
            `Línea ${
              i + 1
            } es la última linea, se esperaba un registro 030 válido.`,
          );
          parseData.detalles.push({ ...record, status: null });
          i++;
        }
      } else {
        i++;
      }
    }

    return {
      success: true,
      message: "Archivo leído correctamente",
      data: parseData,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error al leer el archivo",
      code: "error",
      error,
    };
  }
};
