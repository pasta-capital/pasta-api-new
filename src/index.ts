import "dotenv/config";
import fs from "node:fs/promises";
import http from "node:http";
import https, { ServerOptions } from "node:https";
import * as env from "./config/env.config";
import * as logger from "./common/logger";
import * as databaseHelper from "./common/databaseHelper";
import app from "./app";
import {
  startNotificationScheduler,
  startDebtScheduler,
  startDailyPaymentNotificationsScheduler,
} from "./services/scheduler";
import swaggerDocs from "./swagger";

if (
  (await databaseHelper.connect(env.DB_URI, env.DB_SSL, env.DB_DEBUG)) &&
  (await databaseHelper.init())
) {
  let server: http.Server | https.Server;

  if (env.HTTPS) {
    https.globalAgent.maxSockets = Number.POSITIVE_INFINITY;
    const privateKey = await fs.readFile(env.PRIVATE_KEY, "utf8");
    const certificate = await fs.readFile(env.CERTIFICATE, "utf8");
    const credentials: ServerOptions = { key: privateKey, cert: certificate };
    server = https.createServer(credentials, app);

    server.listen(env.PORT, () => {
      logger.info("HTTPS server is running on Port", env.PORT);
      swaggerDocs(app, env.PORT);
    });
  } else {
    server = app.listen(env.PORT, () => {
      logger.info("HTTP server is running on Port", env.PORT);
      swaggerDocs(app, env.PORT);
    });
  }

  // Start scheduler for scheduled notifications (runs every 60s by default)
  startNotificationScheduler();
  startDebtScheduler();
  startDailyPaymentNotificationsScheduler(86_400_000, {
    hour: Number(env.DAILY_PAYMENT_NOTIFICATIONS_HOUR),
    minute: Number(env.DAILY_PAYMENT_NOTIFICATIONS_MINUTE),
  });

  const close = () => {
    logger.info("Gracefully stopping...");
    server.close(async () => {
      logger.info(`HTTP${env.HTTPS ? "S" : ""} server closed`);
      await databaseHelper.close(true);
      logger.info("MongoDB connection closed");
      // Esperar un momento antes de salir
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });
  };

  // ["SIGTERM", "SIGQUIT"].forEach((signal) => process.on(signal, close));

  ["SIGUSR2", "SIGTERM", "SIGQUIT"].forEach((signal) =>
    process.once(signal, () => {
      close();
      // Después de cerrar, reenvía la señal al proceso para que nodemon continúe con su
      // comportamiento normal.
      process.kill(process.pid, signal);
    }),
  );

  process.on("SIGINT", function () {
    // this is only called on ctrl+c, not restart
    console.log("SIGINT");
    process.kill(process.pid, "SIGINT");
  });
}
