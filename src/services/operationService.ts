import OperationPayment from "../models/operationPayment";
import Operation from "../models/operation";
import { Types } from "mongoose";
import * as env from "../config/env.config";
import { consultDebt } from "./la";
import * as loggers from "../common/logger";
import {
  getOperationPaymentStatusName,
  getDaysDifference,
} from "../common/helper";

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

    const posicionToken = operation.reference || operation.internalReference;
    const posicion = posicionesArray.find(
      (p: any) => p.Refapertura === posicionToken,
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
