import { Request, Response } from "express";
import * as agileCheckService from "../services/agileCheckService";

export const getPerfilRiesgo = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const response = await agileCheckService.getPerfilRiesgo(userId);

    if (response.success) {
      res.status(200).json(response);
    } else if (response.message === "Usuario no válido" || response.message === "userId no válido") {
      res.status(404).json(response);
    } else {
      res.status(400).json(response);
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al procesar la solicitud", error: error });
  }
};

export const buscar = async (req: Request, res: Response) => {
  try {
    const {
      nombres,
      apellidos,
      es_juridico,
      numero_id,
      listas,
      pais,
      pais_id,
      query_mode,
      language,
    } = req.body;

    const response = await agileCheckService.buscar(
      nombres,
      apellidos,
      es_juridico,
      numero_id,
      listas,
      pais,
      pais_id,
      query_mode,
      language,
    );

    res.status(200).json(response);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al procesar la solicitud", error: error });
  }
};
