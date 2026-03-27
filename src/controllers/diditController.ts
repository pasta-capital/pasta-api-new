import { Request, Response } from "express";
import axios from "axios";
import * as loggers from "../common/logger";

const diditVerification = async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  try {
    loggers.operation("Didit - /verification - Starting", {
      action: "didit_verification",
      step: "start",
      sessionId,
    });

    const response = await axios.get(
      `${process.env.P_DIDIT_VERIFICATION_URL}/${sessionId}/decision`,
      {
        headers: {
          "x-api-key": `${process.env.P_DIDIT_API_KEY}`,
          Accept: "application/json",
        },
      },
    );
    loggers.operation("Didit - /verification - Success", {
      action: "didit_verification",
      step: "success",
      sessionId,
      response: response.data,
    });
    res.json({ success: true, data: response.data });
  } catch (error: any) {
    loggers.operation("Didit - /verification - Error", {
      action: "didit_verification",
      step: "error",
      sessionId,
      error: error.response?.data || error.message,
    });
    res.status(error.response?.status || 500).json({
      error: "Failed to fetch verification data",
      details: error.response?.data || error.message,
      success: false,
    });
  }
};

const diditDeleteSession = async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  try {
    loggers.operation("Didit - /delete - Starting", {
      action: "didit_delete",
      step: "start",
      sessionId,
    });

    const response = await axios.delete(
      `${process.env.P_DIDIT_VERIFICATION_URL}/${sessionId}/delete`,
      {
        headers: {
          "x-api-key": `${process.env.P_DIDIT_API_KEY}`,
          Accept: "application/json",
        },
      },
    );
    loggers.operation("Didit - /delete - Success", {
      action: "didit_delete",
      step: "success",
      sessionId,
      response: response.data,
    });
    res.json({ success: true, data: response.data });
  } catch (error: any) {
    loggers.operation("Didit - /delete - Error", {
      action: "didit_delete",
      step: "error",
      sessionId,
      error: error.response?.data || error.message,
    });
    res.status(error.response?.status || 500).json({
      error: "Failed to delete session",
      details: error.response?.data || error.message,
      success: false,
    });
  }
};

export { diditVerification, diditDeleteSession };
