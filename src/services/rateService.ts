import axios from "axios";
import { startOfToday, startOfTomorrow, tryCatch } from "../common/helper";
import RateHistory from "../models/rateHistory";
import * as loggers from "../common/logger";
import * as env from "../config/env.config";

export const updateRate = async () => {
  const { data, error } = await tryCatch(
    axios.post("https://tasa.legendsoft.com/api/tasa/get"),
  );
  if (error) {
    loggers.error(error.message);
  }

  if (data) {
    const exists = await RateHistory.findOne({
      validDate: data!.data.FechaValor,
    });
    if (!exists) {
      const rateHistory = new RateHistory({
        date: data!.data.Fecha,
        validDate: data!.data.FechaValor,
        usd: data!.data.USD,
        rub: data!.data.RUB,
        try: data!.data.TRY,
        cny: data!.data.CNY,
        eur: data!.data.EUR,
      });
      await rateHistory.save();
    }
  }
};

export const updateRateSypago = async () => {
  const { data: response, error } = await tryCatch(
    axios.get(`${env.SYPAGO_API_URL}/bank/bcv/rate`),
  );

  if (error) {
    loggers.error((error as any).message);
    return;
  }

  const data = response?.data;

  if (Array.isArray(data)) {
    const usd = data.find((r: any) => r.code === "USD");
    const eur = data.find((r: any) => r.code === "EUR");

    if (usd && eur) {
      const validDate = new Date(usd.load_date);
      const exists = await RateHistory.findOne({
        validDate: validDate,
      });

      if (!exists) {
        const rateHistory = new RateHistory({
          date: new Date(),
          validDate: validDate,
          usd: usd.rate,
          eur: eur.rate,
        });
        await rateHistory.save();
        loggers.info(`Tasa Sypago actualizada: USD ${usd.rate}, EUR ${eur.rate}`);
        return rateHistory;
      }
    }
  }
};

export const getRateS = async () => {
  const todayStart = startOfToday();
  const tomorrowStart = startOfTomorrow();

  const rateActual = await RateHistory.findOne({
    validDate: {
      $gte: todayStart, // Greater than or equal to the start of today
      $lt: tomorrowStart, // Less than the start of tomorrow
    },
  }, "usd eur");

  if (rateActual) {
    // updateRateSypago();
    return rateActual;
  } 

  const rate = await updateRateSypago();
  if (rate) {
    return { usd: rate.usd, eur: rate.eur };
  }

  const rateHistory = await RateHistory.findOne().sort({ validDate: -1 });
  if (rateHistory) {
    return { usd: rateHistory.usd, eur: rateHistory.eur };
  }

  return { usd: 0, eur: 0 };
};
