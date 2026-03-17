import { Request, Response } from "express";
import UsersGroup from "../models/UsersGroup";
import Joi from "joi";
import mongoose from "mongoose";

const objectId = () => Joi.string().length(24).hex();

const groupSchema = Joi.object({
  title: Joi.string().trim().required(),
  description: Joi.string().allow(null, "").optional(),
  users: Joi.array().items(objectId()).default([]),
});

export async function createGroup(req: Request, res: Response) {
  const { error, value } = groupSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error)
    return res.status(400).json({ success: false, message: error.message });

  const uniqueUsers = Array.from(new Set(value.users));
  const group = await UsersGroup.create({ ...value, users: uniqueUsers });
  return res
    .status(201)
    .json({ success: true, message: "Group created", data: group });
}

export async function listGroups(req: Request, res: Response) {
  const page = Math.max(parseInt(String(req.query.page || 1), 10), 1);
  const size = Math.max(parseInt(String(req.query.size || 10), 10), 1);
  const search = String(req.query.search || "").trim();

  const filter: any = {};
  if (search) filter.title = { $regex: search, $options: "i" };

  const agg = await UsersGroup.aggregate([
    { $match: filter },
    {
      $facet: {
        data: [
          { $sort: { createdAt: -1, _id: 1 } },
          { $skip: (page - 1) * size },
          { $limit: size },
        ],
        pageInfo: [{ $count: "totalRecords" }],
      },
    },
  ]);

  return res
    .status(200)
    .json({ success: true, message: "Groups retrieved", data: agg[0] });
}

export async function getGroup(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ success: false, message: "Invalid id" });
  const group = await UsersGroup.findById(id);
  if (!group)
    return res.status(404).json({ success: false, message: "Group not found" });
  return res
    .status(200)
    .json({ success: true, message: "Group retrieved", data: group });
}

export async function updateGroup(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ success: false, message: "Invalid id" });

  const { error, value } = groupSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error)
    return res.status(400).json({ success: false, message: error.message });

  const uniqueUsers = Array.from(new Set(value.users));
  const group = await UsersGroup.findByIdAndUpdate(
    id,
    { ...value, users: uniqueUsers },
    { new: true },
  );
  if (!group)
    return res.status(404).json({ success: false, message: "Group not found" });
  return res
    .status(200)
    .json({ success: true, message: "Group updated", data: group });
}

export async function deleteGroup(req: Request, res: Response) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ success: false, message: "Invalid id" });
  const resp = await UsersGroup.findByIdAndDelete(id);
  if (!resp)
    return res.status(404).json({ success: false, message: "Group not found" });
  return res.status(200).json({ success: true, message: "Group deleted" });
}
