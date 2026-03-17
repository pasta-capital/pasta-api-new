import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import * as env from "./config/env.config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Pasta API",
      description:
        "API de Legendsoft para gestión de operaciones, usuarios, suscripciones, pagos y notificaciones.",
      contact: {
        name: "Legendsoft",
        url: "https://legendsoft.com",
      },
      version: "1.0.0",
    },
    servers: [{ url: `/${env.API_VERSION}` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Token JWT obtenido al autenticarse",
        },
      },
      schemas: {
        ApiError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            errors: {
              type: "array",
              items: { type: "string" },
              nullable: true,
            },
          },
        },
        ApiSuccess: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: { description: "Datos de respuesta" },
          },
        },
      },
    },
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          description: "Verifica que el servicio esté operativo",
          responses: {
            200: {
              description: "Servicio operativo",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean", example: true },
                      message: { type: "string", example: "Servicio operativo v5" },
                      timestamp: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  // En dev: *.ts | En prod (compilado): *.js
  apis: [
    path.join(__dirname, "routes", "*.ts"),
    path.join(__dirname, "routes", "*.js"),
  ],
};
const swaggerSpec = swaggerJsdoc(options);
function swaggerDocs(app: any, port: any) {
  const swaggerOptions = {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customCss: ".swagger-ui .servers { display: none !important; }",
  };
  // Swagger Page - usa URL relativa (mismo host que /docs), sin selector de servidor
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
  // Documentation in JSON format
  app.get("/docs.json", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
}
export default swaggerDocs;
