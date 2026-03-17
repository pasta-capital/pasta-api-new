import { Request, Response } from "express";
import Enterprise from "../models/enterprise";
import { enterpriseProfileValidationSchema } from "../validations/enterprise/enterpriseProfile";

export const getEnterprises = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1; // Default to page 1 if not provided
  const limit = parseInt(req.query.limit as string) || 10; // Default to 10 items per page if not provided
  const globalFilter = req.query.globalFilter as string;
  const skip = (page - 1) * limit;

  const filter: any = {
    status: "active",
  };
  if (globalFilter) {
    // Create a case-insensitive regular expression for the search term
    const regex = new RegExp(globalFilter, "i");

    // Use the $or operator to search across multiple fields
    filter.$or = [
      { name: { $regex: regex } },
      { rif: { $regex: regex } },
      { email: { $regex: regex } },
    ];
  }

  const totalCount = await Enterprise.countDocuments(filter);

  const enterprises = await Enterprise.find(filter)
    .select(
      "name commercialActivity website email rif address phone contactDetails",
    )
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

  const formattedEnterprises = enterprises.map((enterprise) => {
    return {
      id: enterprise._id,
      name: enterprise.name,
      commercialActivity: enterprise.commercialActivity,
      website: enterprise.website,
      email: enterprise.email,
      rif: enterprise.rif,
      address: enterprise.address,
      phone: enterprise.phone,
      contactDetails: {
        name: enterprise.contactDetails.name,
        lastname: enterprise.contactDetails.lastname,
        email: enterprise.contactDetails.email,
        identification: enterprise.contactDetails.identification,
        phone: enterprise.contactDetails.phone,
      },
    };
  });

  res.status(200).json({
    success: true,
    message: "Enterprises listados",
    data: formattedEnterprises,
    totalCount: totalCount,
  });
};

export const getEnterpriseById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const enterprise = await Enterprise.findById(id)
      .select(
        "name commercialActivity website email rif address phone contactDetails",
      )
      .lean()
      .exec();

    if (!enterprise) {
      return res.status(404).json({
        success: false,
        message: "Enterprise not found",
        code: "not_found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Enterprise found",
      data: enterprise,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al obtener la enterprise",
      code: "error",
      error: error,
    });
  }
};

export const createEnterprise = async (req: Request, res: Response) => {
  const { error } = enterpriseProfileValidationSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    console.log("Validation error:", error.details);
    return res.status(400).json({
      success: false,
      message: `Error de validación: ${error.details
        .map((d) => d.message)
        .join(", ")}`,
      code: "field_missing",
    });
  }

  const enterprise = new Enterprise(req.body);
  const savedEnterprise = await enterprise.save();

  res.status(201).json({
    success: true,
    message: "Enterprise created",
    data: savedEnterprise,
  });
};

export const updateEnterprise = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error } = enterpriseProfileValidationSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: `Error de validación: ${error.details
        .map((d) => d.message)
        .join(", ")}`,
      code: "field_missing",
    });
  }

  const enterprise = await Enterprise.findById(id);

  if (!enterprise) {
    return res.status(404).json({
      success: false,
      message: "Enterprise not found",
      code: "not_found",
    });
  }

  await enterprise.updateOne(req.body);

  res.status(200).json({
    success: true,
    message: "Enterprise updated",
    data: enterprise,
  });
};

export const deleteEnterprise = async (req: Request, res: Response) => {
  const { id } = req.params;

  const enterprise = await Enterprise.findById(id);

  if (!enterprise) {
    return res.status(404).json({
      success: false,
      message: "Enterprise not found",
      code: "not_found",
    });
  }

  enterprise.status = "inactive"; // Mark as inactive instead of deleting
  await enterprise.save();

  res.status(200).json({
    success: true,
    message: "Enterprise deleted",
  });
};

export const uploadEmployeePayroll = async (req: Request, res: Response) => {
  try {
    const payrollData = req.body;
    console.log(payrollData);
    // Aquí procesas los datos, por ejemplo, los guardas en la base de datos
    res.status(200).json({ message: "Datos recibidos correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al procesar los datos" });
  }
};
