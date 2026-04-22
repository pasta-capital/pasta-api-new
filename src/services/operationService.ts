import OperationPayment from "../models/operationPayment";
import Operation from "../models/operation";
import { Types } from "mongoose";
import * as env from "../config/env.config";
import { consultDebt, InsertOperation, InsertPayment } from "./la";
import * as loggers from "../common/logger";
import {
  getOperationPaymentStatusName,
  getDaysDifference,
} from "../common/helper";
import { InsertOperationData } from "../models/la/insertOperationData";
import { createAndSendCampaign } from "./notificationService";
import {
  credit,
  getRejectedCodeDescription,
  getStatusDescription,
  getTransactionResult,
  TransactionStatusCode,
} from "./sypagoService";
import { InsertPaymentData } from "../models/la/insertPaymentData";

export const getOperationPaymentsWithTotalService = async (
  userId: string,
  page: number,
  limit: number,
) => {
  const skip = (page - 1) * limit;

  // Criterio de filtro base por usuario
  const baseFilter = {
    user: new Types.ObjectId(userId),
    status: { $in: ["pending-approval", "pending", "overdue", "inArrears"] },
  };

  const totalCount = await OperationPayment.countDocuments(baseFilter);

  const aggregationResult = await OperationPayment.aggregate([
    { $match: baseFilter },
    {
      $facet: {
        // Pipeline para obtener el listado de pagos del usuario
        userOperationPayments: [
          // Puedes añadir un filtro adicional aquí si quieres que el listado
          // solo muestre un subconjunto de los pagos del usuario (ej. por estado específico)
          // { $match: { status: { $ne: "completed" } } }, // Ejemplo: Excluir pagos completados del listado del usuario
          {
            $lookup: {
              from: "Operation", // Nombre de la colección de Operation (asegúrate de que sea el correcto)
              localField: "operation", // Campo en OperationPayment que referencia a Operation
              foreignField: "_id", // Campo en Operation que coincide con localField
              as: "operationData", // Nombre del nuevo campo que contendrá los documentos de Operation
            },
          },
          {
            $unwind: {
              path: "$operationData",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 0, // Excluye el _id si no lo necesitas
              id: "$_id", // Opcional: renombra _id a id
              date: 1,
              status: 1,
              // Mostrar amountUsdTotal si existe (>0), si no mostrar amountUsd
              amountUsd: {
                $cond: [
                  { $gt: ["$amountUsdTotal", 0] },
                  "$amountUsdTotal",
                  "$amountUsd",
                ],
              },
              iconUrl: {
                $concat: [
                  `${env.PUBLIC_API_URL}/icons/`,
                  "$operationData.icon",
                  "-white.png",
                ],
              },
              statusName: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ["$status", "pending"] },
                      then: "Pendiente",
                    },
                    {
                      case: { $eq: ["$status", "paid"] },
                      then: "Pagado",
                    },
                    {
                      case: { $eq: ["$status", "overdue"] },
                      then: "Vencido",
                    },
                    {
                      case: { $eq: ["$status", "inArrears"] },
                      then: "En mora",
                    },
                    // Agrega más casos según los estados que manejes en tu modelo
                  ],
                  default: "Desconocido", // Valor por defecto si el estado no coincide
                },
              },
              // Incluye otros campos de OperationPayment que necesites mostrar
              // operation: 1, // Opcional: si quieres ver a qué operación pertenece
            },
          },
          {
            $sort: { date: 1 }, // Opcional: Ordena el listado de pagos del usuario
          },
          // Aquí puedes agregar etapas de paginación si es necesario ($skip, $limit)
        ],
        // Pipeline para calcular el total de pagos pendientes del usuario
        pendingTotal: [
          // {
          //   // Filtra solo los pagos con estado "pending" entre los del usuario
          //   $match: { status: "pending" },
          // },
          {
            $group: {
              _id: null, // Agrupa todos los documentos "pending" del usuario en uno solo
              // Suma amountUsdtTotal si existe y es > 0, de lo contrario suma amountUsd
              totalPendingAmountUsd: {
                $sum: {
                  $cond: [
                    { $gt: ["$amountUsdTotal", 0] },
                    "$amountUsdTotal",
                    "$amountUsd",
                  ],
                },
              },
            },
          },
          {
            $project: {
              // Limpia el resultado del total pendiente del usuario
              _id: 0,
              totalPendingAmountUsd: 1,
            },
          },
        ],
      },
    },
  ])
    .skip(skip)
    .limit(limit)
    .exec();

  return { aggregationResult, totalCount };
};

/**
 * Sincroniza las cuotas de una operación desde LA Sistemas
 * @param operationId ID de la operación en nuestra BD
 * @param rif RIF del usuario para consultar la deuda
 */
export const syncDebtPayments = async (operationId: string, rif: string) => {
  try {
    loggers.operation("Iniciando sincronización de deuda", {
      action: "sync_debt_payments",
      operationId,
      rif,
    });

    const operation = await Operation.findById(operationId);
    if (!operation) {
      throw new Error(`Operación ${operationId} no encontrada`);
    }

    const debtResult = await consultDebt({ Rif: rif });
    if (!debtResult.success) {
      throw new Error(`Error al consultar deuda: ${debtResult.message}`);
    }

    const posiciones = debtResult.data?.Posiciones?.Posicion || [];
    const posicionesArray = Array.isArray(posiciones)
      ? posiciones
      : [posiciones];

    const posicionToken = String(operation.laCopaso).trim();

    if (!posicionToken) {
      loggers.operation("Operación sin referencia para sincronización", {
        action: "sync_debt_payments",
        operationId,
      });
      return false;
    }
    console.log("Posición token:", posicionToken);

    const posicion = posicionesArray.find(
      (p: any) => String(p.Copasoapertura || "").trim() === posicionToken,
    );

    if (!posicion) {
      loggers.operation("Operación no encontrada en LA Sistemas aún", {
        action: "sync_debt_payments",
        operationId,
        reference: posicionToken,
      });
      return false;
    }

    if (!posicion.Cuotas?.Cuota) {
      loggers.operation("Posición encontrada pero sin cuotas", {
        action: "sync_debt_payments",
        operationId,
      });
      return false;
    }

    const cuotas = posicion.Cuotas.Cuota;
    const cuotasArray = Array.isArray(cuotas) ? cuotas : [cuotas];

    const paymentIds: Types.ObjectId[] = [];

    for (const cuota of cuotasArray) {
      const [day, month, year] = cuota.Fechacuota.split("/").map(Number);
      const fechaCuota = new Date(year, month - 1, day);
      const montoBruto = parseFloat(
        cuota.Montobruto.replace(/[^\d.-]/g, "").trim(),
      );
      const tasaCuota = parseFloat(
        cuota.Tasacuota.replace(/[^\d.-]/g, "").trim(),
      );
      const interest = parseFloat(cuota.Interes.replace(/[^\d.-]/g, "").trim());
      const montoCuota = parseFloat(
        cuota.Montocuota.replace(/[^\d.-]/g, "").trim(),
      );

      let status = "pending";
      const statusLA = cuota.Status?.toLowerCase() || "";
      if (statusLA.includes("pendiente")) {
        status = "pending";
      } else if (statusLA.includes("pagad")) {
        status = "paid";
      } else if (statusLA.includes("vencid")) {
        status = "overdue";
      } else if (statusLA.includes("mora")) {
        status = "inArrears";
      }

      const payment = await OperationPayment.findOneAndUpdate(
        {
          operation: operation._id,
          laCopaso: cuota.Copasocuota,
        },
        {
          user: operation.user,
          operation: operation._id,
          date: fechaCuota,
          amountUsd: montoBruto,
          amountUsdTotal: montoCuota,
          interest: interest,
          interestRate: tasaCuota,
          status: status,
          laCopaso: cuota.Copasocuota,
          points:
            status === "pending"
              ? montoCuota *
                (getDaysDifference(fechaCuota, new Date()) >= 5 ? 2 : 1)
              : 0,
        },
        { upsert: true, new: true },
      );

      paymentIds.push(payment._id as Types.ObjectId);
    }

    operation.paymentPlan = paymentIds;
    await operation.save();

    loggers.operation("Sincronización de deuda exitosa", {
      action: "sync_debt_payments",
      operationId,
      paymentsCount: paymentIds.length,
    });

    return true;
  } catch (error: any) {
    loggers.error("Error en syncDebtPayments", {
      operationId,
      error: error.message,
    });
    return false;
  }
};

/**
 * Sincroniza todas las operaciones pendientes de pagos
 */
export const syncPendingDebts = async () => {
  try {
    // Buscar operaciones aprobadas que no tienen plan de pagos
    const pendingOperations = await Operation.find({
      status: "approved",
      $or: [{ paymentPlan: { $exists: false } }, { paymentPlan: { $size: 0 } }],
    }).populate("user");

    if (pendingOperations.length === 0) return;

    loggers.operation("Iniciando reintento de sincronización masiva", {
      action: "sync_pending_debts",
      count: pendingOperations.length,
    });

    for (const op of pendingOperations) {
      const user = op.user as any;
      if (user && user.identificationType && user.document) {
        const rif = user.identificationType + user.document;
        await syncDebtPayments(String(op._id), rif);
      }
    }
  } catch (error: any) {
    loggers.error("Error en syncPendingDebts", {
      error: error.message,
    });
  }
};

/**
 * Realiza el flujo de transferencia de dinero a través de Sypago para una operación dada.
 */
const sypagoFlow = async (operation: env.Operation) => {
  if (operation.sypagoId) {
    loggers.operation(
      "Guard: Sypago ID already exists. Skipping credit request, verifying status.",
      {
        operationId: operation._id,
        sypagoId: operation.sypagoId,
      },
    );

    try {
      // We skip the credit() call and go straight to checking the result
      const transaction = await getTransactionResult(operation.sypagoId);
      const transactionStatus = transaction.data?.status;

      if (
        transaction.success &&
        transactionStatus === TransactionStatusCode.ACCP
      ) {
        loggers.operation("Guard: Previous transaction confirmed as SUCCESS.", {
          operationId: operation._id,
        });
        return {
          success: true,
          refIbp: transaction.data.ref_ibp || operation.internalReference,
        };
      }

      if (
        transaction.success &&
        transactionStatus === TransactionStatusCode.RJCT
      ) {
        return {
          success: false,
          isRejected: true,
          message: getRejectedCodeDescription(transaction.data?.rejected_code),
        };
      }

      // If it is still pending, we return false so the loop retries later.
      return {
        success: false,
        message: "Esperando confirmación de pago anterior",
      };
    } catch (error: any) {
      return { success: false, message: `Error en Guard: ${error.message}` };
    }
  }
  const type = !operation.isThirdParty ? "CNTA" : "CELE";
  const number = !operation.isThirdParty
    ? operation.account.number
    : operation.beneficiary?.phone;
  const bankCode = !operation.isThirdParty
    ? operation.account.bank.code
    : operation.beneficiary?.bankCode;

  const identificationType = !operation.isThirdParty
    ? operation.account.number === "00017495563424733075"
      ? "V"
      : operation.user.identificationType
    : operation.beneficiary?.identificationType;
  const document = !operation.isThirdParty
    ? operation.account.number === "00017495563424733075"
      ? "15854963"
      : operation.user.document
    : operation.beneficiary?.identificationNumber;

  const sypagoCreditBody = {
    internal_id: operation.internalReference,
    account: {
      bank_code: env.SYPAGO_BANK_ACCOUNT_CODE!,
      type: "CNTA",
      number: env.SYPAGO_BANK_ACCOUNT_NUMBER!,
    },
    sub_product: env.SYPAGO_CREDIT_SUBPRODUCT_ID!,
    amount: {
      amt: operation.settledAmount,
      currency: "VES",
    },
    notification_urls: {
      web_hook_endpoint: env.SYPAGO_WEBHOOK_URL!,
    },
    receiving_user: {
      name: operation.user.name + " " + operation.user.lastname,
      document_info: {
        type: identificationType,
        number: document,
      },
      account: {
        bank_code: bankCode,
        type: type,
        number: number,
      },
    },
    concept: "Pago movil",
  };

  loggers.operation("Confirm Operation - Iniciando crédito Sypago", {
    action: "confirm_operation",
    step: "sypago_credit_start",
    userId: operation.user._id,
    operationId: operation._id,
    reference: operation.internalReference,
    sypagoCreditBody: {
      internal_id: sypagoCreditBody.internal_id,
      amount: sypagoCreditBody.amount,
      receiving_user: {
        document_info: sypagoCreditBody.receiving_user.document_info,
        account: {
          bank_code: sypagoCreditBody.receiving_user.account.bank_code,
          type: sypagoCreditBody.receiving_user.account.type,
        },
      },
    },
  });
  try {
    const creditTransaction = await credit(sypagoCreditBody);

    loggers.operation("Confirm Operation - Respuesta crédito Sypago", {
      action: "confirm_operation",
      step: "sypago_credit_response",
      userId: operation.user._id,
      operationId: operation._id,
      success: creditTransaction.success,
      transactionId: creditTransaction.data?.transaction_id,
      message: creditTransaction.message,
    });

    if (!creditTransaction.success || !creditTransaction.data?.transaction_id) {
      loggers.operation("Confirm Operation - Error en crédito Sypago", {
        action: "confirm_operation",
        step: "sypago_credit_error",
        userId: operation.user._id,
        operationId: operation._id,
        error: creditTransaction.message,
        data: creditTransaction.data,
      });
      return {
        success: false,
        isRejected: true,
        message: "Error inicial Sypago",
      };
    }

    operation.sypagoId = creditTransaction.data.transaction_id;
    await operation.save();

    loggers.operation(
      "Confirm Operation - Obteniendo resultado de transacción",
      {
        action: "confirm_operation",
        step: "get_transaction_result_start",
        userId: operation.user._id,
        operationId: operation._id,
        transactionId: creditTransaction.data.transaction_id,
      },
    );

    /**GET SYPAGO TRANSACTION RESULT */
    const transaction = await getTransactionResult(
      creditTransaction.data.transaction_id,
    );

    loggers.operation("Confirm Operation - Resultado de transacción obtenido", {
      action: "confirm_operation",
      step: "get_transaction_result_response",
      userId: operation.user._id,
      operationId: operation._id,
      success: transaction.success,
      status: transaction.data?.status,
      rejectedCode: transaction.data?.rejected_code,
    });

    if (!transaction.success || !transaction.data) {
      loggers.operation("Confirm Operation - Error obteniendo transacción", {
        action: "confirm_operation",
        step: "get_transaction_result_error",
        userId: operation.user._id,
        operationId: operation._id,
        error: transaction.message,
      });
      return {
        success: false,
        isRejected: true,
        message: "Error verificando resultado",
      };
    }

    if (transaction.data.status !== TransactionStatusCode.ACCP) {
      loggers.operation("Confirm Operation - Transacción rechazada", {
        action: "confirm_operation",
        step: "transaction_rejected",
        userId: operation.user._id,
        operationId: operation._id,
        status: transaction.data.status,
        rejectedCode: transaction.data.rejected_code,
        statusDescription: getStatusDescription(transaction.data.status),
        rejectedDescription: getRejectedCodeDescription(
          transaction.data.rejected_code,
        ),
      });
      return {
        success: false,
        message: getRejectedCodeDescription(transaction.data.rejected_code),
        isRejected: true, // This tells the loop to call rejectOperation()
      };
    }
    operation.reference = transaction.data.ref_ibp;
    await operation.save();
    return {
      success: true,
      refIbp: transaction.data.ref_ibp || operation.internalReference,
    };
  } catch (error: any) {
    return { success: false, message: error.message, isRejected: true };
  }
};

/**
 * Realiza el paso final de sincronización con LA Sistemas para registrar el pago (abono) de la operación
 */
const finalLASyncFlow = async (
  operation: env.Operation,
  refIbp: string,
  iniDate: string,
) => {
  const insertPaymentCommissionBody: InsertPaymentData = {
    Rif: operation.user.identificationType + operation.user.document,
    Val_gra: "G",
    FlEmi: iniDate,
    FlDisp: iniDate,
    Cuenta: "",
    Concepto: "",
    TpPaso: "E",
    Nunota: operation.internalReference,
    Refer: refIbp,
    Nurefer: "",
    Nucorre: 1,
    Fpago: 3,
    Monto: operation.amountVef.toFixed(2).replace(".", ","),
    Tpcambio: "1",
    Copaso: operation.laCopaso,
    Nupaso: 0,
    Statusabono: 1,
    Statusliq: "B",
    Statusoper: "N",
    Codcontrap: "640201",
  };
  try {
    const insertPaymentCommissionResult = await InsertPayment(
      insertPaymentCommissionBody,
    );
    if (!insertPaymentCommissionResult.success) {
      loggers.error("Error al insertar la comisión en LA", {
        error: insertPaymentCommissionResult.message,
        data: insertPaymentCommissionResult.data,
      });
      return {
        success: false,
        message:
          insertPaymentCommissionResult.message ||
          "Error al insertar la comisión en LA",
      };
    }

    operation.status = "approved";
    operation.laStatus = "completed";
    operation.expireAt = undefined;
    await operation.save();

    loggers.operation("Confirm Operation - Operación aprobada exitosamente", {
      action: "confirm_operation",
      step: "operation_approved",
      userId: operation.user._id,
      operationId: operation._id,
      operationData: {
        status: operation.status,
        reference: operation.reference,
        sypagoId: operation.sypagoId,
        laCopaso: operation.laCopaso,
        icon: operation.icon,
      },
    });
    return { success: true };
    // #TODO: END INSERT PAYMENT DATA
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

/**
 * Marca la operación como rechazada tanto en nuestra base de datos como en LA Sistemas, y notifica al usuario del rechazo
 */
const rejectOperation = async (
  operation: env.Operation,
  reason: string,
  iniDate: string,
) => {
  const insertOperationData: InsertOperationData = {
    Rif: operation.user.identificationType + operation.user.document,
    Validagraba: "A",
    Producto: "C2",
    Moneda: "1",
    Monefec: "0",
    Comi: (-(operation.commissionAmount ?? 0)).toFixed(2),
    Inicio: iniDate,
    Venc: iniDate,
    Cuotas: operation.feeCount.toString(),
    Monto: operation.amountUsd.toFixed(2),
    Tpcambio: operation.rate.toString(),
    Tasa: operation.annualCommission.toString(),
    Fpago: "1",
    // Refer: transaction.data.ref_ibp ?? reference,
    Refer: "",
    Tpint: "V",
    Numesa: "1",
    Nuveh: "1",
    // Nucorre: "1",
    Nucorre: "",
    Tipomm: "0",
    Copaso: "",
  };
  const voidInsertOperation = await InsertOperation({
    ...insertOperationData,
    Copaso: operation.laCopaso,
  });
  loggers.operation(`Operación anulada - OperationId : ${operation._id}`, {
    action: "confirm_operation",
    step: "void_operation",
    operationId: operation._id,
    status: voidInsertOperation.data.status,
  });
  const pushNotification = {
    audience: "USER",
    infoType: "ERROR",
    type: "MOBILE",
    title: "Operación fallida",
    description: voidInsertOperation.success
      ? "Tu pasta no se ha podido procesar, intenta nuevamente"
      : `Pasta no procesada, comparte el siguiente mensaje con soporte : ${voidInsertOperation.data.Copaso}`,
    users: [new Types.ObjectId(operation.user._id)],
    status: "scheduled",
    isPromotional: false,
  };
  await createAndSendCampaign(pushNotification);
  await Operation.findByIdAndUpdate(operation._id, {
    $set: {
      status: "rejected",
      syncError: reason,
      laStatus: voidInsertOperation.success ? "voided" : "void_failed",
    },
    $unset: { expireAt: 1 },
  });
};

/**
 * Procesa la cola cíclica para sincronizar operaciones pendientes de sincronización con LA Sistemas y Sypago. Este proceso se ejecuta cada 15 minutos y maneja reintentos, rechazos y notificaciones.
 */
export const processCyclicQueue = async () => {
  try {
    const queue = await Operation.find({
      status: "processing",
      laStatus: {
        $nin: [
          "completed",
          "voided",
          "void_failed",
          "rejected",
          "manual_review_la_fail",
        ],
      },
      syncAttempts: { $lt: 4 },
    })
      .populate("user")
      .populate("account.bank")
      .sort({ createdAt: 1 });

    if (queue.length === 0) return;

    loggers.operation("Iniciando reintento de sincronización masiva", {
      action: "sync_pending_debts",
      count: queue.length,
    });

    for (const op of queue) {
      try {
        const rif = op.user.identificationType + op.user.document;

        // Setup Date for LA Headers
        const today = new Date();
        const day = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const year = today.getFullYear();
        const iniDate = `${day}/${month}/${year}`;

        // --- STEP 1: SYNC DEBT ---
        if (op.laStatus !== "synced") {
          const syncSuccess = await syncDebtPayments(String(op._id), rif);

          if (!syncSuccess) {
            op.syncAttempts += 1;
            op.lastSyncAttemptAt = today;

            if (op.syncAttempts >= 4) {
              await rejectOperation(
                op,
                "Falla tras 4 intentos de sincronización",
                iniDate,
              );
              continue; // avoid saving stale in-memory state over the rejection
            }

            await op.save();
            continue; // next user
          }

          op.laStatus = "synced";
          await op.save();
        }

        // --- STEP 2: SYPAGO FLOW (Money Transfer) ---
        const paymentResult = await sypagoFlow(op);
        if (!paymentResult.success) {
          if (paymentResult.isRejected) {
            await rejectOperation(
              op,
              `Rechazo Bancario: ${paymentResult.message}`,
              iniDate,
            );
          }
          // If not a hard rejection, we don't increment syncAttempts here;
          // we just let the next sweep try again.
          continue;
        }

        // --- STEP 3: FINAL LA SYNC ---
        const laPaymentSync = await finalLASyncFlow(
          op,
          paymentResult.refIbp,
          iniDate,
        );

        if (laPaymentSync.success) {
          const pushNotification = {
            audience: "USER",
            infoType: "SUCCESS",
            type: "MOBILE",
            title: "Operación exitosa",
            description:
              "Tu pasta se ha procesado exitosamente, verifica tu cuenta",
            users: [new Types.ObjectId(op.user._id)],
            status: "scheduled",
            isPromotional: false,
          };
          await createAndSendCampaign(pushNotification);
        } else {
          // Critical: Money sent, but LA system didn't acknowledge the abono
          op.laStatus = "manual_review_la_fail";
          await op.save();
          loggers.error(
            `ALERTA: Pago enviado pero fallo abono en LA para ${op._id}`,
          );
        }
      } catch (innerError: any) {
        loggers.error(
          `Error processing individual operation ${op._id}:`,
          innerError.message,
        );
      }
    }
  } catch (globalError: any) {
    loggers.error("Global Cyclic Queue Critical Error:", globalError.message);
  }
};
