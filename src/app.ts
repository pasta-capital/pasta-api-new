import express from "express";
import helmet from "helmet";
import nocache from "nocache";
import compression from "compression";
import cors from "./middlewares/cors";
import cookieParser from "cookie-parser";
import * as env from "./config/env.config";
import allowedMethods from "./middlewares/allowedMethods";
import userRoutes from "./routes/userRoutes";
import accountRoutes from "./routes/accountRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import adminRoutes from "./routes/adminRoutes";
import creditScoreRoutes from "./routes/creditScoreRoutes";
import rateRoutes from "./routes/rateRoutes";
import roleRoutes from "./routes/roleRoutes";
import balanceRoutes from "./routes/balanceRoutes";
import operationRoutes from "./routes/operationRoutes";
import bancamigaRoutes from "./routes/bancamigaRoutes";
import enterpriseRoutes from "./routes/enterpriseRoutes";
import agileCheckRoutes from "./routes/agileCheckRoutes";
import subsciptionRoutes from "./routes/subscriptionRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import locationRoutes from "./routes/locationRoutes";
import groupRoutes from "./routes/groupRoutes";
import notificationV2Routes from "./routes/notificationV2Routes";
import configRoutes from "./routes/configRoutes";
import laRoutes from "./routes/laRoutes";
import overduePaymentRoutes from "./routes/overduePaymentRoutes";
import customerHistoryRoutes from "./routes/customerHistoryRoutes";

import upcomingPaymentRoutes from "./routes/upcomingPaymentRoutes";
import { errorHandler } from "./middlewares/errorHandler";
import path from "path";
import { fileURLToPath } from "url";
import diditRoutes from "./routes/diditRoutes";
import bvcRoutes from "./BVC/routes/v1/bvc-routes";
import { bvcErrorHandler } from "./BVC/middleware/error-handler.middleware";

const app = express();

app.use(helmet.contentSecurityPolicy());
app.use(helmet.dnsPrefetchControl());
app.use(helmet.crossOriginEmbedderPolicy());
app.use(helmet.frameguard());
app.use(helmet.hidePoweredBy());
app.use(helmet.hsts());
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(helmet.permittedCrossDomainPolicies());
app.use(helmet.referrerPolicy());
app.use(helmet.xssFilter());
app.use(helmet.originAgentCluster());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(helmet.crossOriginOpenerPolicy());

app.use(nocache());
app.use(compression({ threshold: 0 }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.json({ limit: "50mb" }));

// Obtener __dirname en el ámbito de los módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/public", express.static(path.join(__dirname, "../src/", "public")));

app.use(cors());
app.options("*", cors());
app.use(cookieParser(env.COOKIE_SECRET));
app.use(allowedMethods);

app.get(`/${env.API_VERSION}/health`, (req, res) => {
  res.status(200).json({
    ok: true,
    message: "Servicio operativo v5",
    timestamp: new Date().toISOString(),
  });
});

app.use(`/${env.API_VERSION}/users`, userRoutes);
app.use(`/${env.API_VERSION}/accounts`, accountRoutes);
app.use(`/${env.API_VERSION}/notifications`, notificationRoutes);
app.use(`/${env.API_VERSION}/admin`, adminRoutes);
app.use(`/${env.API_VERSION}/credit-score`, creditScoreRoutes);
app.use(`/${env.API_VERSION}/rate`, rateRoutes);
app.use(`/${env.API_VERSION}/roles`, roleRoutes);
app.use(`/${env.API_VERSION}/balance`, balanceRoutes);
app.use(`/${env.API_VERSION}/operation`, operationRoutes);
app.use(`/${env.API_VERSION}/bancamiga`, bancamigaRoutes);
app.use(`/${env.API_VERSION}/enterprise`, enterpriseRoutes);
app.use(`/${env.API_VERSION}/agile-check`, agileCheckRoutes);
app.use(`/${env.API_VERSION}/subscriptions`, subsciptionRoutes);
app.use(`/${env.API_VERSION}/dashboard`, dashboardRoutes);
app.use(`/${env.API_VERSION}/groups`, groupRoutes);
app.use(`/${env.API_VERSION}/notifications-v2`, notificationV2Routes);
app.use(`/${env.API_VERSION}/config`, configRoutes);
app.use(`/${env.API_VERSION}/locations`, locationRoutes);
app.use(`/${env.API_VERSION}/la`, laRoutes);
app.use(`/${env.API_VERSION}/overdue-payments`, overduePaymentRoutes);
app.use(`/${env.API_VERSION}/customer-history`, customerHistoryRoutes);
app.use(`/${env.API_VERSION}/upcoming-payments`, upcomingPaymentRoutes);
app.use(`/${env.API_VERSION}/bvc`, bvcRoutes, bvcErrorHandler);

// New routes created by the PerCapital Tech Team
app.use(`/${env.API_VERSION}/didit`, diditRoutes);

app.use(errorHandler);

export default app;
