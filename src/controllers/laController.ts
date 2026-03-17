import { Request, Response } from "express";
import asyncHandler from "../common/asyncHandler";
import LaModel from "../models/laModel";
import {
  getGender,
  getMaritalStatus,
  getTxt,
  updateClientData,
} from "../services/la";
import User from "../models/User";
import UserAddress from "../models/UserAddress";
import Config from "../models/config";
import { ClientUpdateData } from "../models/la/clientUpdateData";
import Bank from "../models/Bank";
import Account from "../models/Account";
import * as env from "../config/env.config";
import * as logger from "../common/logger";

// Tipos válidos según databaseHelper.ts
const VALID_TYPES = [
  "OCUPACION",
  "SITUACIONLAB",
  "NIVEL",
  "TPCTAS",
  "CIUDAD",
  "ESTADO",
  "POSTAL",
];

/**
 * Obtener todos los elementos de un tipo específico
 */
export const getLaModelByType = asyncHandler(
  async (req: Request, res: Response) => {
    const { type } = req.params;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "El tipo es requerido",
        code: "field_missing",
      });
    }

    const upperType = type.toUpperCase();
    if (!VALID_TYPES.includes(upperType)) {
      return res.status(400).json({
        success: false,
        message: `Tipo inválido. Los tipos válidos son: ${VALID_TYPES.join(
          ", ",
        )}`,
        code: "invalid_type",
      });
    }

    const items = await LaModel.find({ type: upperType })
      .select("name code type -_id")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: items,
    });
  },
);

/**
 * Obtener un elemento específico por código y tipo
 */
export const getLaModelByCode = asyncHandler(
  async (req: Request, res: Response) => {
    const { type, code } = req.params;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "El tipo es requerido",
        code: "field_missing",
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "El código es requerido",
        code: "field_missing",
      });
    }

    const upperType = type.toUpperCase();
    if (!VALID_TYPES.includes(upperType)) {
      return res.status(400).json({
        success: false,
        message: `Tipo inválido. Los tipos válidos son: ${VALID_TYPES.join(
          ", ",
        )}`,
        code: "invalid_type",
      });
    }

    const item = await LaModel.findOne({
      type: upperType,
      code: code.trim(),
    }).select("name code type -_id");

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Elemento no encontrado",
        code: "not_found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: item,
    });
  },
);

/**
 * Obtener todos los tipos disponibles
 */
export const getLaModelTypes = asyncHandler(
  async (req: Request, res: Response) => {
    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: VALID_TYPES,
    });
  },
);

/**
 * Obtener ocupaciones
 */
export const getOcupaciones = asyncHandler(
  async (req: Request, res: Response) => {
    const items = await LaModel.find({ type: "OCUPACION" })
      .select("name code -_id")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: items,
    });
  },
);

/**
 * Obtener situaciones laborales
 */
export const getSituacionesLaborales = asyncHandler(
  async (req: Request, res: Response) => {
    const items = await LaModel.find({ type: "SITUACIONLAB" })
      .select("name code -_id")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: items,
    });
  },
);

/**
 * Obtener niveles
 */
export const getNiveles = asyncHandler(async (req: Request, res: Response) => {
  const items = await LaModel.find({ type: "NIVEL" })
    .select("name code -_id")
    .sort({ code: 1 });

  const processedItems = items.map((item) => ({
    ...item.toObject(),
    name: item.name === "N" ? "NINGUNO" : item.name,
  }));

  return res.status(200).json({
    success: true,
    message: "Consulta exitosa",
    data: processedItems,
  });
});

/**
 * Obtener tipos de cuentas
 */
export const getTiposCuentas = asyncHandler(
  async (req: Request, res: Response) => {
    const items = await LaModel.find({ type: "TPCTAS" })
      .select("name code -_id")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: items,
    });
  },
);

/**
 * Obtener ciudades
 */
export const getCiudades = asyncHandler(async (req: Request, res: Response) => {
  const items = await LaModel.find({ type: "CIUDAD" })
    .select("name code -_id")
    .sort({ name: 1 });

  return res.status(200).json({
    success: true,
    message: "Consulta exitosa",
    data: items,
  });
});

/**
 * Obtener estados
 */
export const getEstados = asyncHandler(async (req: Request, res: Response) => {
  const items = await LaModel.find({ type: "ESTADO" })
    .select("name code -_id")
    .sort({ name: 1 });

  return res.status(200).json({
    success: true,
    message: "Consulta exitosa",
    data: items,
  });
});

/**
 * Obtener códigos postales
 */
export const getCodigosPostales = asyncHandler(
  async (req: Request, res: Response) => {
    const items = await LaModel.find({ type: "POSTAL" })
      .select("name code -_id")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: items,
    });
  },
);

/**
 * Obtener una ocupación específica por código
 */
export const getOcupacionByCode = asyncHandler(
  async (req: Request, res: Response) => {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "El código es requerido",
        code: "field_missing",
      });
    }

    const item = await LaModel.findOne({
      type: "OCUPACION",
      code: code.trim(),
    }).select("name code -_id");

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Ocupación no encontrada",
        code: "not_found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: item,
    });
  },
);

/**
 * Obtener una situación laboral específica por código
 */
export const getSituacionLaboralByCode = asyncHandler(
  async (req: Request, res: Response) => {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "El código es requerido",
        code: "field_missing",
      });
    }

    const item = await LaModel.findOne({
      type: "SITUACIONLAB",
      code: code.trim(),
    }).select("name code -_id");

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Situación laboral no encontrada",
        code: "not_found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: item,
    });
  },
);

/**
 * Obtener un nivel específico por código
 */
export const getNivelByCode = asyncHandler(
  async (req: Request, res: Response) => {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "El código es requerido",
        code: "field_missing",
      });
    }

    const item = await LaModel.findOne({
      type: "NIVEL",
      code: code.trim(),
    }).select("name code -_id");

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Nivel no encontrado",
        code: "not_found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: item,
    });
  },
);

/**
 * Obtener un tipo de cuenta específico por código
 */
export const getTipoCuentaByCode = asyncHandler(
  async (req: Request, res: Response) => {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "El código es requerido",
        code: "field_missing",
      });
    }

    const item = await LaModel.findOne({
      type: "TPCTAS",
      code: code.trim(),
    }).select("name code -_id");

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Tipo de cuenta no encontrado",
        code: "not_found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: item,
    });
  },
);

/**
 * Obtener una ciudad específica por código
 */
export const getCiudadByCode = asyncHandler(
  async (req: Request, res: Response) => {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "El código es requerido",
        code: "field_missing",
      });
    }

    const item = await LaModel.findOne({
      type: "CIUDAD",
      code: code.trim(),
    }).select("name code -_id");

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Ciudad no encontrada",
        code: "not_found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: item,
    });
  },
);

/**
 * Obtener un estado específico por código
 */
export const getEstadoByCode = asyncHandler(
  async (req: Request, res: Response) => {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "El código es requerido",
        code: "field_missing",
      });
    }

    const item = await LaModel.findOne({
      type: "ESTADO",
      code: code.trim(),
    }).select("name code -_id");

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Estado no encontrado",
        code: "not_found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: item,
    });
  },
);

/**
 * Obtener un código postal específico por código
 */
export const getCodigoPostalByCode = asyncHandler(
  async (req: Request, res: Response) => {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "El código es requerido",
        code: "field_missing",
      });
    }

    const item = await LaModel.findOne({
      type: "POSTAL",
      code: code.trim(),
    }).select("name code -_id");

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Código postal no encontrado",
        code: "not_found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: item,
    });
  },
);

export const updateLaModels = asyncHandler(
  async (req: Request, res: Response) => {
    const types = [
      "OCUPACION",
      "SITUACIONLAB",
      "NIVEL",
      "TPCTAS",
      "CIUDAD",
      "ESTADO",
      "POSTAL",
      "BANCOS",
    ];

    for (const type of types) {
      const fileName = `${type}.TXT`;
      const response = await getTxt(fileName);
      if (response.success && response.data && response.data.Items) {
        await LaModel.deleteMany({ type: type });
        const laModelsData = response.data.Items.filter(
          (item: { Linea: string }) => item.Linea.trim() !== "",
        ).map((item: { Linea: string }) => {
          const laCode = item.Linea.trim();
          const name = item.Linea.split("-")[1] || item.Linea.trim();
          return {
            name: name,
            code: laCode,
            type: type,
          };
        });
        await LaModel.insertMany(laModelsData);
      }
    }
    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: "Modelos actualizados correctamente",
    });
  },
);

export const clientUpdate = asyncHandler(
  async (req: Request, res: Response) => {
    const users = await User.find({ status: "active" });

    for (const user of users) {
      try {
        // Obtener UserAddress con populate
        const userAddress = await UserAddress.findOne({ user: user._id })
          .populate("country", "code")
          .populate("state", "code name")
          .populate("municipality", "code name")
          .populate("parish", "code name")
          .lean();

        // Obtener valores de configuración para campos obligatorios
        const laOficinaConfig = await Config.findOne({ key: "la-oficina" });
        const laCiejecutivoConfig = await Config.findOne({
          key: "la-ciejecutivo",
        });
        const laTppersonaConfig = await Config.findOne({ key: "la-tppersona" });

        const account = await Account.findOne({ user: user._id }).populate<{
          bank: env.Bank;
        }>({
          path: "bank",
          select: "code laCode",
        });

        // Obtener bank directamente como en register
        const bank = account?.bank
          ? await Bank.findOne({ code: (account.bank as any).code })
          : null;

        // Obtener código del estado desde LaModel (igual que en editProfileConfirmation)
        const state = userAddress?.state
          ? (userAddress.state as any).name || undefined
          : undefined;

        let stateCode = "";
        if (state) {
          const laState = await LaModel.findOne({
            name: { $regex: state, $options: "i" },
          }).select("code");
          if (laState) stateCode = laState.code || "";
        }

        // Preparar datos para LA Sistemas
        const clientUpdateData: ClientUpdateData = {
          // Campos obligatorios
          Apellido: user.lastname || "",
          Nombre: user.name || "",
          Rif: user.identificationType + user.document,
          Nuejecutivo: "7",
          Ejecutivo: "1",
          Ciejecutivo: laCiejecutivoConfig?.value || "001",
          Edocivil: getMaritalStatus(user.maritalStatus) || "",
          Oficina: laOficinaConfig?.value || "0001",
          Tppersona: laTppersonaConfig?.value || "1",
          Tlf1:
            typeof user.phone === "object" && user.phone?.number
              ? `${user.phone.countryCode || ""}${
                  user.phone.areaCode || ""
                }${user.phone.number.replace(/^0+/, "")}`
              : typeof user.phone === "string"
                ? (user.phone as string)?.replace(/^0+/, "")
                : undefined,
          Tlf2: "",
          Tlfejecutivo: "",
          Emailejecutivo: "",
          Certifejecutivo: "",
          Fotoejecutivo: "",
          Extejecutivo: "",
          Email: user.email || undefined,
          Demail: "",
          Verificacionemail: "",
          Stat: "S",
          Riftraspaso: "",
          Fecontrato: "",
          Numcontrato: " ",
          Perfil: " ",
          Situacionlab: user.selfEmployed ? "1-DEPENDIENTE" : "2-EMPLEADO",
          Situacionlablegal: "",
          Grupo: "INV",
          Paisresid: "VE",
          Paisnac: "VE",
          Paisotro: "VE",
          Nacionalidad: "VE-VENEZOLANO",
          Estado: stateCode,
          Postal: userAddress?.zipCode || undefined,
          Profesionco: "",
          Empresa: user.enterprise?.name || "",
          Ocupacion: user.occupation || "",
          Antiguedadempresa: user.seniority ? String(user.seniority) : "",
          Dirempre1: user.enterprise?.address || "",
          Nivelacad: user.education || "",
          Banco: bank?.laCode || "",
          Cuenta: account?.number || "",
          Tpcuenta: account?.type || "",
          Publicexp: user.pep ? "S" : "N",
          Documpolitexp: user.pep ? "S" : "N",
          Cargopolitexp: user.pepInfo?.occupation || "",
          Cargoempresa: user.enterprise?.position || "",
          Apepolitexp: user.pepInfo?.name || "",
          Feingresoempresa: "",
          Rifempresa: "",
          Actividadco: "",
          Empresaref: "",
          Empleadoref: "",
          Oficinaref: "",
          Empresacoref: "",
          Empleadocoref: "",
          Oficinacoref: "",
          Institutopagot: "",
          Períodopagot: "",
          Cuentaccbu: "",
          Escotitulares: "",
          Monbasecliente: "",
          Lineatipo: "",
          Lineamonto: "",
          // Información personal
          Sexo: getGender(user.gender) || undefined,
          Nacimiento: user.birthDate
            ? (() => {
                const date = new Date(user.birthDate);
                const day = date.getDate().toString().padStart(2, "0");
                const month = (date.getMonth() + 1).toString().padStart(2, "0");
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
              })()
            : undefined,

          // Información de dirección
          Dirhabitacion1: userAddress?.street || undefined,
          Dirhabitacion2: userAddress?.housingName || undefined,
          Dirhabitacion3: userAddress?.housingType || undefined,
          Referencias: {
            Referencia: [],
          },
          Balance: {
            Ingsalario: "       0.00",
            Ingbono: "       0.00",
            Ingrenta: "       0.00",
            Inginver: "       0.00",
            Ingotros: "       0.00",
            Egrprestamos: "       0.00",
            Egrpagpend: "       0.00",
            Egrpagreg: "       0.00",
            Egrhipotecas: "       0.00",
            Egrotros: "       0.00",
            Ingpaisorigen: "",
            Ingtpfrecuencia: "",
            Ingprocedencia: "",
            Ingrecepfing: "",
            Ingrecepfotros: "",
            Ingdetalle: "",
          },
        };

        // Llamar al método de actualización
        const laUpdateResult = await updateClientData(clientUpdateData);

        logger.info(
          `LA Update Result for user ${user.email}: ${JSON.stringify(
            laUpdateResult,
          )}`,
        );
      } catch (error: any) {
        logger.error(`Error updating user ${user.email}: ${error.message}`);
      }
    }
    return res.status(200).json({
      success: true,
      message: "Usuarios actualizados correctamente",
      data: "Usuarios actualizados correctamente",
    });
  },
);
