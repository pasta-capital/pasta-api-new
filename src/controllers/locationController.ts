import * as fs from "fs";
import * as stream from "stream";
import { Request, Response } from "express";
import Location from "../models/location";
import asyncHandler from "../common/asyncHandler";

// Ruta del archivo Excel (ajústala según tu proyecto)
const filePath = "C:/Users/edgar/Downloads/LISTADO_PAIS_ESTADO_CIUDAD.xlsx";

export const importLocations = async (req: Request, res: Response) => {
  // Leer el archivo Excel
  const XLSX = await import("xlsx/xlsx.mjs");
  XLSX.set_fs(fs);
  XLSX.stream.set_readable(stream.Readable);
  const workbook = XLSX.readFile(filePath);

  // Obtener los nombres de las hojas
  const sheetNames = workbook.SheetNames;
  console.log("Hojas encontradas:", sheetNames);

  /**
   * 1️⃣ PAISES
   */
  const sheet = workbook.Sheets["PAIS"];
  const dataPaises = XLSX.utils.sheet_to_json(sheet).map((c: any) => {
    return {
      name: c.NOMBRE,
      type: "country",
      code: c.ID,
    };
  });

  const locationsPais = await Location.insertMany(dataPaises);

  /**
   * 2️⃣ ESTADOS
   */
  const sheetEstados = workbook.Sheets["ESTADO"];
  const rawEstados = XLSX.utils.sheet_to_json(sheetEstados);
  const dataEstadosInsert = [] as any;
  console.log(rawEstados);

  locationsPais.forEach((pais: any) => {
    const filtered = rawEstados.filter(
      (c: any) => c.ID_ATRIBUTO.toString() === pais.code,
    );
    filtered.forEach((c: any) => {
      dataEstadosInsert.push({
        name: c.NOMBRE,
        type: "state",
        code: c.ID,
        location: pais._id, // usa el _id del país
      });
    });
  });

  const locationsEstados = await Location.insertMany(dataEstadosInsert);

  /**
   * 3️⃣ MUNICIPIOS
   */
  const sheetMunicipios = workbook.Sheets["MUNICIPIO"];
  const rawMunicipios = XLSX.utils.sheet_to_json(sheetMunicipios);
  const dataMunicipiosInsert = [] as any;

  locationsEstados.forEach((estado: any) => {
    const filtered = rawMunicipios.filter(
      (c: any) => c.ID_ATRIBUTO.toString() === estado.code,
    );
    filtered.forEach((c: any) => {
      dataMunicipiosInsert.push({
        name: c.NOMBRE,
        type: "municipality",
        code: c.ID,
        location: estado._id,
      });
    });
  });

  const locationsMunicipios = await Location.insertMany(dataMunicipiosInsert);

  /**
   * 4️⃣ PARROQUIAS
   */
  const sheetParroquias = workbook.Sheets["PARROQUIA"];
  const rawParroquias = XLSX.utils.sheet_to_json(sheetParroquias);
  const dataParroquiasInsert = [] as any;

  locationsMunicipios.forEach((municipio: any) => {
    const filtered = rawParroquias.filter(
      (c: any) => c.ID_ATRIBUTO.toString() === municipio.code,
    );
    filtered.forEach((c: any) => {
      dataParroquiasInsert.push({
        name: c.NOMBRE,
        type: "parish",
        code: c.ID,
        location: municipio._id,
      });
    });
  });

  await Location.insertMany(dataParroquiasInsert);

  return res.status(200).json({ message: "Locations imported successfully" });
};

export const getCountry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Id es requerido",
      code: "field_missing",
    });
  }
  const country = await Location.findOne({ type: "country", code: id });
  if (!country) {
    return res.status(404).json({
      success: false,
      message: "País no encontrado",
      code: "not_found",
    });
  }
  return res.status(200).json({
    success: true,
    message: "Consulta exitosa",
    data: country,
  });
});

export const getCountries = asyncHandler(
  async (req: Request, res: Response) => {
    const countries = await Location.find({ type: "country" }).select(
      "code name -_id",
    );

    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: countries,
    });
  },
);

export const getState = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Id es requerido",
      code: "field_missing",
    });
  }
  const state = await Location.findOne({ type: "state", code: id });
  if (!state) {
    return res.status(404).json({
      success: false,
      message: "Estado no encontrado",
      code: "not_found",
    });
  }
  return res.status(200).json({
    success: true,
    message: "Consulta exitosa",
    data: state,
  });
});

export const getStates = asyncHandler(async (req: Request, res: Response) => {
  const { country } = req.query;
  if (!country) {
    return res.status(400).json({
      success: false,
      message: "País es requerido",
      code: "field_missing",
    });
  }

  const states = await Location.aggregate([
    {
      $lookup: {
        from: "Location", // nombre real de la colección
        localField: "location", // o "location" según tu campo
        foreignField: "_id",
        as: "location",
      },
    },
    {
      $match: {
        type: "state",
        "location.code": country,
      },
    },
    { $unwind: "$location" },
    {
      $project: {
        _id: 0,
        name: 1,
        code: 1,
      },
    },
    { $sort: { name: 1 } },
  ]);

  return res.status(200).json({
    success: true,
    message: "Consulta exitosa",
    data: states,
  });
});

export const getMunicipality = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Id es requerido",
        code: "field_missing",
      });
    }
    const municipality = await Location.findOne({
      type: "municipality",
      code: id,
    });
    if (!municipality) {
      return res.status(404).json({
        success: false,
        message: "Municipio no encontrado",
        code: "not_found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: municipality,
    });
  },
);

export const getMunicipalities = asyncHandler(
  async (req: Request, res: Response) => {
    const { state } = req.query;
    if (!state) {
      return res.status(400).json({
        success: false,
        message: "Estado es requerido",
        code: "field_missing",
      });
    }

    const states = await Location.aggregate([
      {
        $lookup: {
          from: "Location", // nombre real de la colección
          localField: "location", // o "location" según tu campo
          foreignField: "_id",
          as: "location",
        },
      },
      {
        $match: {
          type: "municipality",
          "location.code": state,
        },
      },
      { $unwind: "$location" },
      {
        $project: {
          _id: 0,
          name: 1,
          code: 1,
        },
      },
      { $sort: { name: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      message: "Consulta exitosa",
      data: states,
    });
  },
);

export const getParish = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Id es requerido",
      code: "field_missing",
    });
  }
  const parish = await Location.findOne({ type: "parish", code: id });
  if (!parish) {
    return res.status(404).json({
      success: false,
      message: "Parroquia no encontrado",
      code: "not_found",
    });
  }
  return res.status(200).json({
    success: true,
    message: "Consulta exitosa",
    data: parish,
  });
});

export const getParishes = asyncHandler(async (req: Request, res: Response) => {
  const { municipality } = req.query;
  if (!municipality) {
    return res.status(400).json({
      success: false,
      message: "Municipio es requerido",
      code: "field_missing",
    });
  }

  const states = await Location.aggregate([
    {
      $lookup: {
        from: "Location", // nombre real de la colección
        localField: "location", // o "location" según tu campo
        foreignField: "_id",
        as: "location",
      },
    },
    {
      $match: {
        type: "parish",
        "location.code": municipality,
      },
    },
    { $unwind: "$location" },
    {
      $project: {
        _id: 0,
        name: 1,
        code: 1,
      },
    },
    { $sort: { name: 1 } },
  ]);

  return res.status(200).json({
    success: true,
    message: "Consulta exitosa",
    data: states,
  });
});
