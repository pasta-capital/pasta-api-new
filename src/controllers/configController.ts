import { Request, Response } from "express";
import Config from "../models/config";
import asyncHandler from "../common/asyncHandler";

export const addConfig = asyncHandler(async (req: Request, res: Response) => {
  const { key, value, type, description } = req.body;

  const config = await Config.findOne({ key });
  if (config) {
    config.value = value;
    config.type = type;
    config.description = description;
    await config.save();
  } else {
    const newConfig = new Config({
      key,
      value,
      type,
      description,
    });
    await newConfig.save();
  }
  return res.status(200).json({
    success: true,
    message: "Config updated successfully",
  });
});
