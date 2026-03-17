import { Request, Response } from "express";
import CreditScore from "../models/creditScore";
import { tryCatch } from "../common/helper";
import { CreditScore as CreditScoreEnv } from "../config/env.config";
import Config from "../models/config";

/**
 * Get credit score
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getCreditScore = async (req: Request, res: Response) => {
  const { data, error } = await tryCatch(
    CreditScore.find(
      {},
      "-_id code name score items.name items.code items.value",
    ).lean(),
  );
  const { data: minScore } = await tryCatch(
    Config.findOne({ key: "min-score" }, "-_id key value").lean(),
  );
  if (error) {
    res.status(404).send({ message: "Credit score not found", error });
  } else {
    res
      .status(200)
      .send({ success: true, data, minScore: minScore?.value ?? 0 });
  }
};

/**
 * Update credit score
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const updateCreditScore = async (req: Request, res: Response) => {
  const { items: updates, minScore } = req.body;
  if (minScore) {
    const { data, error } = await tryCatch(
      Config.updateOne(
        { key: "min-score" },
        { $set: { value: minScore } },
        { upsert: true },
      ),
    );
    if (error) {
      res
        .status(404)
        .send({ success: false, message: "Min score not updated", error });
    }
  }

  const operations = [];

  for (const update of updates) {
    // Actualiza los campos del documento principal (code, name, score)
    const { code, items, ...mainUpdate } = update; // Separa 'items' del resto de los campos

    if (Object.keys(mainUpdate).length > 0) {
      operations.push({
        updateOne: {
          filter: { code: code },
          update: { $set: { score: mainUpdate.score } }, // Solo actualiza los campos proporcionados
        },
      });
    }

    // Actualiza los items individualmente
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const { code: itemCode, ...itemUpdate } = item; // Separa el 'code' del item del resto de los campos
        console.log(itemUpdate);
        if (Object.keys(itemUpdate).length > 0) {
          operations.push({
            updateOne: {
              filter: { code: code, "items.code": itemCode }, // Encuentra el item específico dentro del array 'items'
              update: { $set: { "items.$.value": itemUpdate.value } }, // Solo actualiza los campos proporcionados en el item
            },
          });
        }
      }
    }
  }

  // Ejecuta la operación bulkWrite
  const { data, error } = await tryCatch(CreditScore.bulkWrite(operations));
  if (error) {
    res
      .status(404)
      .send({ success: false, message: "Credit score not updated", error });
  } else {
    res
      .status(200)
      .send({ success: true, message: "Credit score updated successfully" });
  }
};
