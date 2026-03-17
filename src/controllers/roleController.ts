import { Request, Response } from "express";
import { tryCatch } from "../common/helper";
import Module from "../models/module";
import Role from "../models/role";
import Admin from "../models/admin";

export const getModules = async (req: Request, res: Response) => {
  const { data, error } = await tryCatch(Module.find({}, "name code").lean());
  if (error) {
    return res
      .status(500)
      .send({ success: false, message: "Error getting modules" });
  }
  return res.status(200).send({ success: true, data });
};

export const getRoles = async (req: Request, res: Response) => {
  const { data, error } = await tryCatch(
    Role.find({}, "name code description")
      .populate({
        path: "modules",
        select: "code name",
      })
      .lean(),
  );
  if (error) {
    return res
      .status(500)
      .send({ success: false, message: "Error getting roles" });
  }
  return res.status(200).send({ success: true, data });
};

export const createRole = async (req: Request, res: Response) => {
  const { name, description, modules } = req.body;
  if (!name || !description || !modules) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Name, description and modules are required",
        code: "field_missing",
      });
  }

  const role = await Role.create({ name, description, modules });
  res.status(201).json({ success: true, message: "Role created successfully" });
};

export const getRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const role = await Role.findById(id);
  if (!role) {
    return res.status(404).json({ success: false, message: "Role not found" });
  }
  return res.status(200).json({ success: true, data: role });
};

export const editRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, modules } = req.body;
  if (!name || !description || !modules) {
    return res
      .status(400)
      .json({
        success: false,
        message: " Name, description and modules are required",
        code: "field_missing",
      });
  }

  const role = await Role.findById(id);
  if (!role) {
    return res
      .status(404)
      .json({ success: false, message: "Rol no encontrado" });
  }
  role.name = name;
  role.description = description;
  role.modules = modules;
  await role.save();
  res.status(200).json({ success: true, message: "Rol editado con éxito" });
};

export const deleteRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const role = await Role.findById(id);
  if (!role) {
    return res
      .status(404)
      .json({ success: false, message: "Rol no encontrado" });
  }

  const usersExist = await Admin.exists({ roles: { $in: [id] } });
  if (usersExist) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Rol no puede eliminarse porque tiene usuarios asociados",
      });
  }

  await Role.findByIdAndDelete(id);
  res.status(200).json({ success: true, message: "Rol eliminado con éxito" });
};
