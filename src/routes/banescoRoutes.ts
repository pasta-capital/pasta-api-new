import { Router } from "express";
import {
  accountChargeLink,
  accountChargePayment,
  accountConsult,
  callback,
  transactionConfirm,
} from "../controllers/banescoController";

const banescoRouter = Router();

banescoRouter.post("/account-charge-link", accountChargeLink);
banescoRouter.post("/account-consult", accountConsult);
banescoRouter.post("/account-charge-payment", accountChargePayment);
banescoRouter.post("/transaction-confirm", transactionConfirm);
banescoRouter.get("/callback", callback);

export default banescoRouter;
