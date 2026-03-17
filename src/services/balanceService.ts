import AdminAccount from "../models/adminAccount";
import Balance from "../models/balance";

export const registerBalance = async (
  isIncome: boolean,
  amount: number,
  description: string,
  reference: string,
  client?: string,
) => {
  const adminAccount = await AdminAccount.findOne({ currency: "VEF" });
  if (!adminAccount) {
    throw Error("Error obteniendo cuenta operativa");
  }

  await Balance.create({
    account: adminAccount._id,
    isIncome,
    amount,
    description,
    reference,
    client,
  });
};
