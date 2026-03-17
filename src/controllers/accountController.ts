import { Request, Response } from "express";
import asyncHandler from "../common/asyncHandler";
import * as env from "../config/env.config";
import Account from "../models/Account";
import Bank from "../models/Bank";
import { tryCatch } from "../common/helper";

/**
 * Get accounts
 *
 * @exports
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 *
 */
export const getAccounts = asyncHandler(async (req: Request, res: Response) => {
  const accounts = await Account.find({ user: req.user!.id }, "type number")
    .populate<{
      bank: env.Bank;
    }>({
      path: "bank",
      select: "code name",
    })
    .lean();
  if (accounts.length === 0) {
    return res
      .status(200)
      .json({ success: true, message: "No accounts found", data: [] });
  }

  const transformedAccounts = accounts.map((account) => {
    const { bank } = account;
    return {
      id: account._id,
      type: account.type,
      number: maskNumber(account.number), // <-- enmascarado
      bankCode: bank.code,
      bankName: bank.name,
    };
  });

  return res.status(200).json({
    success: true,
    message: "Accounts retrieved successfully",
    data: transformedAccounts,
  });
});

/**
 * Get account
 *
 * @exports
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getAccount = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Account id is required",
      code: "field_missing",
    });
  }

  const account = await Account.findOne({
    user: req.user!.id,
    _id: id,
  }).populate<{
    bank: env.Bank;
  }>({
    path: "bank",
    select: "code name",
  });

  if (!account)
    return res.status(404).json({
      success: false,
      message: "Account not found",
      code: "account_not_found",
    });

  const result = {
    id: account._id,
    type: account.type,
    number: maskNumber(account.number), // <-- enmascarado
    bankCode: account.bank.code,
    bankName: account.bank.name,
  };

  return res.status(200).json({
    success: true,
    message: "Account retrieved successfully",
    data: result,
  });
});

/**
 * Get account
 *
 * @exports
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getAccountUnmasked = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Account id is required",
        code: "field_missing",
      });
    }

    const account = await Account.findOne({
      user: req.user!.id,
      _id: id,
    }).populate<{
      bank: env.Bank;
    }>({
      path: "bank",
      select: "code name",
    });

    if (!account)
      return res.status(404).json({
        success: false,
        message: "Account not found",
        code: "account_not_found",
      });

    const result = {
      id: account._id,
      type: account.type,
      number: account.number,
      bankCode: account.bank.code,
      bankName: account.bank.name,
    };

    return res.status(200).json({
      success: true,
      message: "Account retrieved successfully",
      data: result,
    });
  },
);

/**
 * Create account
 *
 * @exports
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const createAccount = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { bankCode, type, number } = req.body;
      if (!bankCode || !type || !number) {
        return res.status(400).json({
          success: false,
          message: "Bank code, type and number are required",
          code: "field_missing",
        });
      }
      const bank = await Bank.findOne({ code: bankCode });
      if (!bank) {
        throw new Error("Bank not found");
      }
      const account = await Account.create({
        user: req.user!.id,
        bank: bank._id,
        type,
        number,
      });
      await account.save();
      res
        .status(201)
        .json({ success: true, message: "Account created successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error creating account", error });
    }
  },
);

/**
 * Create account for user
 *
 * @exports
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const createAccountForUser = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      const { bank: bankId, type, number } = req.body;
      if (!bankId || !type || !number) {
        return res.status(400).json({
          success: false,
          message: "Bank, type and number are required",
          code: "field_missing",
        });
      }
      const bank = await Bank.findById(bankId);
      if (!bank) {
        throw new Error("Bank not found");
      }
      const account = await Account.create({
        user: userId,
        bank: bank._id,
        type,
        number,
      });
      await account.save();
      res
        .status(201)
        .json({ success: true, message: "Account created successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error creating account", error });
    }
  },
);

/**
 * Delete account for user
 *
 * @exports
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deleteAccountForUser = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Account id is required",
        code: "parameter_missing",
      });
    }

    const account = await Account.exists({ _id: id, user: userId });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
        code: "account_not_found",
      });
    }

    await Account.findOneAndDelete({ _id: id, user: userId });
    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  },
);

/**
 * Update account
 *
 * @exports
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const updateAccount = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { type, number, bankCode } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Account id is required",
        code: "parameter_missing",
      });
    }

    if (!type || !number || !bankCode) {
      return res.status(400).json({
        success: false,
        message: "Type, number and bankCode are required",
        code: "field_missing",
      });
    }

    const bank = await Bank.findOne({ code: bankCode });
    if (!bank) {
      return res.status(400).json({
        success: false,
        message: "Bank code not valid",
        code: "invalid_bank_code",
      });
    }

    const updated = await Account.findOneAndUpdate(
      { _id: id, user: req.user!.id },
      { type, number, bank: bank._id },
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      message: "Account updated successfully",
    });
  },
);

/**
 * Delete account
 *
 * @exports
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deleteAccount = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Account id is required" });
    }

    const account = await Account.exists({ _id: id, user: req.user!.id });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
        code: "account_not_found",
      });
    }

    await Account.findOneAndDelete({ _id: id, user: req.user!.id });

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  },
);

/**
 * Get banks
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getBanks = async (req: Request, res: Response) => {
  const { data, error } = await tryCatch(Bank.find({}, "code name").lean());
  if (error) {
    return res
      .status(400)
      .json({ success: false, message: "Error", code: "error", error: error });
  }
  return res
    .status(200)
    .json({ success: true, message: "Banks retrieved successfully", data });
};

// Añadir helper para enmascarar números: mostrar primeros 4 y últimos 4, enmascarar el resto con *
function maskNumber(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "";
  const s = String(value);
  if (s.length <= 8) {
    // Si no hay suficiente longitud para separar, devolver tal cual
    return s;
  }
  const first = s.slice(0, 4);
  const last = s.slice(-4);
  const middleMask = "*".repeat(Math.max(0, s.length - 8));
  return `${first}${middleMask}${last}`;
}
