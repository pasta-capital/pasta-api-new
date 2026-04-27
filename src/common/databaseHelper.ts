import mongoose, { ConnectOptions, model } from "mongoose";
import * as env from "../config/env.config";
import * as loggers from "./logger";
import Bank from "../models/Bank";
import Account from "../models/Account";
import Token from "../models/Token";
import Operation from "../models/operation";
import Beneficiary from "../models/Beneficiary";
import Level from "../models/level";
import * as helper from "./helper";
import Notification from "../models/Notification";
import NotificationCounter from "../models/NotificationCounter";
import User from "../models/User";
import LevelHistory from "../models/levelHistory";
import Admin from "../models/admin";
import CreditScore from "../models/creditScore";
import Module from "../models/module";
import Role from "../models/role";
import RateHistory from "../models/rateHistory";
import FrequentQuestion from "../models/frequentQuestion";
import BanescoDomiciliation from "../models/banescoDomiciliation";
import AdminAccount from "../models/adminAccount";
import Balance from "../models/balance";
import OperationPayment from "../models/operationPayment";
import Config from "../models/config";
import { BankOperation, IBankOperation } from "../BVC/models/operation";
import { BankLog, IBankLog } from "../BVC/models/logs";
import Subscription from "../models/subscription";
import SubscriptionPayment from "../models/subscriptionPayment";
import BanescoTransaction from "../models/banescoTransaction";
import AgileCheckList from "../models/agileCheckList";
import Achievement from "../models/achievement";
import SypagoTransaction from "../models/sypagoTransaction";
import bancamigaPagoMovil from "../models/bancamigaPagoMovil";
import Location from "../models/location";
import LaModel from "../models/laModel";
import creditScoreData from "../config/data/creditScore";
import banksData from "../config/data/banks";
import modulesData from "../config/data/modules";
import configData from "../config/data/config";
import levelData from "../config/data/level";
import agileCheckListData from "../config/data/agileCheckLists";
import achievementData from "../config/data/achievements";
import frequentQuestionsData from "../config/data/frequentQuestions";
import { getTxt } from "../services/la";

/**
 * Coonect to MongoDB.
 *
 * @export
 * @async
 * @param {string} uri
 * @param {boolean} SSL
 * @param {boolean} debug
 * @returns {Promise<boolean>}
 */
export const connect = async (uri: string, SSL: boolean, debug: boolean) => {
  let options: ConnectOptions = {};
  if (SSL) {
    options = {
      tls: true,
      tlsCertificateKeyFile: env.DB_SSL_CERT,
      tlsCAFile: env.DB_SSL_CA,
    };
  }

  mongoose.set("debug", debug);
  mongoose.Promise = globalThis.Promise;

  try {
    await mongoose.connect(uri, options);
    loggers.info("MongoDB connection established");
    return true;
  } catch (error) {
    loggers.error("MongoDB connection failed:", error);
    return false;
  }
};

/**
 * Close MongoDB connection.
 *
 * @export
 * @async
 * @param {boolean} force
 * @returns {Promise<void>}
 */
export const close = async (force: boolean = true): Promise<void> =>
  await mongoose.connection.close(force);

/**
 * Initialize database.
 *
 * @export
 * @async
 * @returns {Promise<boolean>}
 */
export const init = async (): Promise<boolean> => {
  try {
    if (mongoose.connection.readyState) {
      await createCollection<env.User>(User);
      await createCollection<env.Account>(Account);
      await createCollection<env.Bank>(Bank);
      await createCollection<env.Token>(Token);
      await createCollection<env.Notification>(Notification);
      await createCollection<env.NotificationCounter>(NotificationCounter);
      await createCollection<env.Operation>(Operation);
      await createCollection<env.Beneficiary>(Beneficiary);
      await createCollection<env.Level>(Level);
      await createCollection<env.LevelHistory>(LevelHistory);
      await createCollection<env.Admin>(Admin);
      await createCollection<env.CreditScore>(CreditScore);
      await createCollection<env.RateHistory>(RateHistory);
      await createCollection<env.Module>(Module);
      await createCollection<env.Role>(Role);
      await createCollection<env.AdminAccount>(AdminAccount);
      await createCollection<env.Balance>(Balance);
      await createCollection<env.OperationPayment>(OperationPayment);
      await createCollection<env.Config>(Config);
      await createCollection<env.Subscription>(Subscription);
      await createCollection<env.SubscriptionPayment>(SubscriptionPayment);
      await createCollection<env.BanescoTransaction>(BanescoTransaction);
      await createCollection<env.AgileCheckList>(AgileCheckList);
      await createCollection<env.Achievement>(Achievement);
      await createCollection<env.FrequentQuestion>(FrequentQuestion);
      await createCollection<env.BanescoDomiciliation>(BanescoDomiciliation);
      await createCollection<env.SypagoTransaction>(SypagoTransaction);
      await createCollection<env.BancamigaPagoMovil>(bancamigaPagoMovil);
      await createCollection<env.Location>(Location);
      await createCollection<env.LaModel>(LaModel);
      await createCollection<IBankOperation>(BankOperation);
      await createCollection<IBankLog>(BankLog);
      await seedBanks();
      await seedCreditScore();
      await seedRoles();
      await seedConfig();
      await seedLevels();
      await seedAgileCheckLists();
      await seedAchievements();
      await seedFrequentQuestions();
      await seedLaModels();
    }
    return true;
  } catch (error) {
    loggers.error("Database init failed:", error);
    return false;
  }
};

const createCollection = async <T>(model: mongoose.Model<T>) => {
  try {
    await model.collection.indexes();
  } catch (error) {
    await model.createCollection();
    await model.createIndexes();
  }
};

async function seedBanks() {
  try {
    // Verificar si ya existen bancos en la base de datos
    const existingBanks = await Bank.find();
    if (existingBanks.length === 0) {
      // Insertar los bancos si la colección está vacía
      await Bank.insertMany(banksData);
      console.log("Datos de bancos cargados exitosamente.");
    }

    // Cerrar la conexión
    //await mongoose.connection.close();
  } catch (error) {
    console.error("Error al cargar los datos de bancos:", error);
  }
}

async function seedCreditScore() {
  try {
    const creditScore = await CreditScore.findOne();
    if (!creditScore) {
      await CreditScore.insertMany(creditScoreData);
      loggers.info("Datos de credit score cargados exitosamente.");
    }
  } catch (error) {
    loggers.error("Error al cargar los datos de credit score:", error);
  }
}

export async function generateDbToken(
  email: string,
  type: string,
  user: string | null = null,
) {
  let token = await Token.findOne({ email, type });
  if (token) {
    token.token = helper.generateCode(4);
    token.expireAt = new Date(Date.now() + env.TOKEN_EXPIRE_AT * 1000);
    await token.save();
  } else {
    token = new Token({
      user,
      email,
      token: helper.generateCode(4),
      expireAt: new Date(Date.now() + env.TOKEN_EXPIRE_AT * 1000),
      type,
    });
    await token.save();
  }
  return token;
}

async function seedRoles() {
  try {
    const modules = await Module.find();
    if (modules.length === 0) {
      await Module.insertMany(modulesData);
      loggers.info("Modules loaded successfully.");
    }

    const allModule = await Module.findOne({ code: "all" });
    if (!allModule) {
      throw new Error('Seed data is missing module "all"');
    }

    const roles = await Role.find();
    if (roles.length === 0) {
      const role = new Role({
        name: "Admin",
        description: "Administrador",
        modules: [allModule],
      });
      await role.save();
      loggers.info("Roles loaded successfully.");
    }
  } catch (error) {
    loggers.error("Error loading roles:", error);
  }
}

async function seedConfig() {
  try {
    const configList = await Config.find();
    if (configList.length === 0) {
      await Config.insertMany(configData);
      loggers.info("Config loaded successfully.");
    }
  } catch (error) {
    loggers.error("Error loading config:", error);
  }
}

async function seedLevels() {
  try {
    const levels = await Level.find();
    if (levels.length === 0) {
      await Level.insertMany(levelData);
      loggers.info("Levels loaded successfully.");
    }
  } catch (error) {
    loggers.error("Error loading levels:", error);
  }
}

async function seedAgileCheckLists() {
  try {
    const agileCheckLists = await AgileCheckList.find();
    if (agileCheckLists.length === 0) {
      await AgileCheckList.insertMany(agileCheckListData);
      loggers.info("AgileCheckLists loaded successfully.");
    }
  } catch (error) {
    loggers.error("Error loading AgileCheckLists:", error);
  }
}

async function seedAchievements() {
  try {
    const achievements = await Achievement.find();
    if (achievements.length === 0) {
      await Achievement.insertMany(achievementData);
      loggers.info("Achievements loaded successfully.");
    }
  } catch (error) {
    loggers.error("Error loading Achievements:", error);
  }
}

async function seedFrequentQuestions() {
  try {
    const frequentQuestions = await FrequentQuestion.find();
    if (frequentQuestions.length === 0) {
      await FrequentQuestion.insertMany(frequentQuestionsData);
      loggers.info("FrequentQuestions loaded successfully.");
    }
  } catch (error) {
    loggers.error("Error loading FrequentQuestions:", error);
  }
}

async function seedLaModels() {
  try {
    const laModels = await LaModel.find();
    if (laModels.length === 0) {
      const types = [
        "OCUPACION",
        "SITUACIONLAB",
        "NIVEL",
        "TPCTAS",
        "CIUDAD",
        "ESTADO",
        "POSTAL",
        "BANCOS",
      ];
      for (const type of types) {
        const fileName = `${type}.TXT`;
        const response = await getTxt(fileName);
        if (response.success && response.data && response.data.Items) {
          const laModelsData = response.data.Items.filter(
            (item: { Linea: string }) => item.Linea.trim() !== "",
          ).map((item: { Linea: string }) => {
            const laCode = item.Linea.trim();
            const name = item.Linea.split("-")[1] || item.Linea.trim();
            return {
              name: name,
              code: laCode,
              type: type,
            };
          });
          await LaModel.insertMany(laModelsData);
          loggers.info(
            `${type} loaded successfully. ${laModelsData.length} ${type} inserted.`,
          );
        } else {
          loggers.error(
            `Error loading ${type} from LA Sistemas: ${
              response.message || "Unknown error"
            }`,
          );
        }
      }
    }
  } catch (error) {
    loggers.error("Error loading LaModels:", error);
  }
}
