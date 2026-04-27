import Config from "../../models/config";
import { bancamigaProvider } from "./bancamigaProvider";
import { bvcProvider } from "./bvcProvider";

const BANK_MAP: Record<string, any> = {
  "0172": bancamigaProvider, // Bancamiga
  "0134": bvcProvider, // BVC
};

export const getBankCodeSettings = async () => {
  const bankCodeSettings = await Config.findOne({
    key: "active-bank-code",
  }).lean();
  if (!bankCodeSettings) {
    return "0172";
  }
  return bankCodeSettings.value;
};

export const getActiveBankProvider = (code: string) => {
  const provider = BANK_MAP[code];
  if (!provider) {
    throw new Error(`Bank code ${code} is not supported in the registry.`);
  }
  return provider;
};
