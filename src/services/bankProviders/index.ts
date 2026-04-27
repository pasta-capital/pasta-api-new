import Config from "../../models/config";
import { bancamigaProvider } from "./bancamigaProvider";
import { bvcProvider } from "./bvcProvider";

const BANK_MAP: Record<string, any> = {
  "0172": bancamigaProvider, // Bancamiga
  "0134": bvcProvider, // BVC
};

const BANK_LABELS: Record<string, string> = {
  "0172": "Bancamiga",
  "0134": "BVC",
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

export const setActiveBank = async (code: string) => {
  const provider = BANK_MAP[code];

  if (!provider) {
    throw new Error(`Bank code ${code} is not supported in the registry.`);
  }

  const config = await Config.findOneAndUpdate(
    { key: "active-bank-code" },
    {
      $set: {
        value: code,
        type: "string",
        description:
          "Código del banco activo para desembolso y recibo de pagos",
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  return {
    code: String(config?.value || code),
    provider,
  };
};

export const getAvailableBanks = () => {
  return Object.keys(BANK_MAP).map((code) => ({
    code,
    name: BANK_LABELS[code] || code,
  }));
};

export const getActiveBankSettings = async () => {
  const activeCode = await getBankCodeSettings();

  return {
    current: {
      code: activeCode,
      name: BANK_LABELS[activeCode] || activeCode,
    },
    available: getAvailableBanks(),
  };
};
