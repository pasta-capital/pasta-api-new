import * as env from "../config/env.config";

export const getSessionDecision = async (sessionId: string) => {
  // const endpoint = `${env.DIDIT_VERIFICATION_URL}/session/${sessionId}/decision/`;
  const endpoint = `${env.DIDIT_VERIFICATION_URL}/${sessionId}/decision/`;

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": env.DIDIT_API_KEY,
  };

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers,
    });

    const data = await response.json();

    if (response.ok) {
      return data;
    } else {
      throw new Error(data.message ?? data.detail);
    }
  } catch (err) {
    throw err;
  }
};

export const createSession = async (
  vendorData: string | null,
  metadata: string | null,
  callback: string | null,
) => {
  const endpoint = `${env.DIDIT_VERIFICATION_URL}/session/`;

  const body = {
    vendor_data: vendorData,
    metadata: metadata,
    callback: callback,
    workflow_id: env.DIDIT_WORKFLOW_ID,
  };

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": env.DIDIT_API_KEY,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok) {
      return data;
    } else {
      throw new Error(data.message ?? data.detail);
    }
  } catch (err) {
    throw err;
  }
};
