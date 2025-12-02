// src/modules/sslCommerz/sslCommerz.service.ts
import axios, { AxiosResponse } from "axios";
import dotenv from "dotenv";
import { AppError } from "../utils/AppError";

dotenv.config();

export interface ISSLInitPayload {
  name: string;
  email: string;
  phoneNumber: string;
  address?: string;
  amount: number;
  transactionId: string;
  productName?: string;
  productCategory?: string;
  productProfile?: string;
  city?: string;
  state?: string;
  postcode?: string | number;
  country?: string;
  fax?: string;
}

type TSSLInitResponse = any;

const getEnv = (k: string) => {
  const v = process.env[k];
  if (!v) {
    console.warn(`[sslCommerz] env missing: ${k}`);
  }
  return v || "";
};

export const SSLService = {
  sslPaymentInit: async (payload: ISSLInitPayload): Promise<TSSLInitResponse> => {
    // validate critical envs early
    const STORE_ID = getEnv("SSL_STORE_ID");
    const STORE_PASS = getEnv("SSL_STORE_PASS");
    const PAYMENT_API = getEnv("SSL_PAYMENT_API"); // e.g. https://sandbox.sslcommerz.com/gwprocess/v4/api.php

    if (!STORE_ID || !STORE_PASS || !PAYMENT_API) {
      throw AppError.internalError("SSLCommerz environment variables are not configured (SSL_STORE_ID/SSL_STORE_PASS/SSL_PAYMENT_API).");
    }

    try {
      const data: Record<string, any> = {
        store_id: STORE_ID,
        store_passwd: STORE_PASS,
        total_amount: payload.amount,
        currency: "BDT",
        tran_id: payload.transactionId,
        success_url: (process.env.SSL_SUCCESS_BACKEND_URL || "").replace(/\/$/, "") + `?transactionId=${encodeURIComponent(payload.transactionId)}&amount=${encodeURIComponent(String(payload.amount))}&status=success`,
        fail_url: (process.env.SSL_FAIL_BACKEND_URL || "").replace(/\/$/, "") + `?transactionId=${encodeURIComponent(payload.transactionId)}&amount=${encodeURIComponent(String(payload.amount))}&status=fail`,
        cancel_url: (process.env.SSL_CANCEL_BACKEND_URL || "").replace(/\/$/, "") + `?transactionId=${encodeURIComponent(payload.transactionId)}&amount=${encodeURIComponent(String(payload.amount))}&status=cancel`,
        ipn_url: process.env.SSL_IPN_URL || "",
        shipping_method: "N/A",
        product_name: payload.productName ?? "Service",
        product_category: payload.productCategory ?? "Service",
        product_profile: payload.productProfile ?? "general",
        cus_name: payload.name,
        cus_email: payload.email,
        cus_add1: payload.address ?? "N/A",
        cus_add2: "N/A",
        cus_city: payload.city ?? "Dhaka",
        cus_state: payload.state ?? "Dhaka",
        cus_postcode: payload.postcode ?? "1000",
        cus_country: payload.country ?? "Bangladesh",
        cus_phone: payload.phoneNumber,
        cus_fax: payload.fax ?? "N/A",
        ship_name: "N/A",
        ship_add1: "N/A",
        ship_add2: "N/A",
        ship_city: "N/A",
        ship_state: "N/A",
        ship_postcode: "N/A",
        ship_country: "N/A"
      };

      const params = new URLSearchParams();
      Object.keys(data).forEach((k) => {
        const v = data[k];
        params.append(k, v === undefined || v === null ? "" : String(v));
      });

      // send request
      let response: AxiosResponse<any>;
      try {
        response = await axios.post(PAYMENT_API, params.toString(), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 20000
        });
      } catch (err: any) {
        // network / non-2xx error
        const r = err?.response;
        console.error("[sslCommerz] HTTP request failed:", {
          url: PAYMENT_API,
          status: r?.status,
          data: r?.data,
          message: err.message
        });
        // bubble up a helpful AppError that includes status and body when possible
        const msg = r?.data ? `SSLCommerz returned HTTP ${r.status}` : `Network error: ${err.message}`;
        throw AppError.internalError(msg);
      }

      // debug log full response for troubleshooting
      console.info("[sslCommerz] init response status:", response.status);
      console.debug("[sslCommerz] init response data:", JSON.stringify(response.data).slice(0, 2000)); // trim to avoid huge logs

      if (!response.data) {
        throw AppError.internalError("Empty response from SSLCommerz payment API");
      }

      // Common successful response contains GatewayPageURL
      if (response.data?.GatewayPageURL) {
        return response.data;
      }

      // Some sandbox responses wrap differently — return raw data but also surface reason
      // If response.data has an error message, include it
      const possibleMsg = response.data?.failedreason || response.data?.failed_reason || response.data?.message || null;
      if (possibleMsg) {
        console.error("[sslCommerz] init failed reason:", possibleMsg);
        // still return data so caller can store it
        return response.data;
      }

      // default: return raw response (caller will check GatewayPageURL)
      return response.data;
    } catch (error: any) {
      const errInfo = error?.message || error;
      console.error("[sslCommerz] sslPaymentInit error (final):", errInfo);
      // If error is already AppError, rethrow it
      if (error?.isOperational && error?.statusCode) throw error;
      throw AppError.internalError("SSLCommerz payment initialization failed");
    }
  },

  validatePayment: async (payload: Record<string, any>): Promise<any> => {
    const STORE_ID = getEnv("SSL_STORE_ID");
    const STORE_PASS = getEnv("SSL_STORE_PASS");
    const VALIDATE_API = getEnv("SSL_VALIDATION_API"); // e.g. https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php

    if (!STORE_ID || !STORE_PASS || !VALIDATE_API) {
      throw AppError.internalError("SSLCommerz validation environment variables missing (SSL_STORE_ID/SSL_STORE_PASS/SSL_VALIDATION_API).");
    }

    try {
      const val_id = payload?.val_id;
      if (!val_id) throw AppError.badRequest("val_id missing in IPN payload");

      const url = `${VALIDATE_API}?val_id=${encodeURIComponent(val_id)}&store_id=${encodeURIComponent(STORE_ID)}&store_passwd=${encodeURIComponent(STORE_PASS)}`;

      const response = await axios.get(url, { timeout: 15000 });

      console.info("[sslCommerz] validate response status:", response.status);
      console.debug("[sslCommerz] validate response data:", JSON.stringify(response.data).slice(0, 2000));

      if (!response.data) throw AppError.internalError("Empty response from SSLCommerz validation API");

      return response.data;
    } catch (error: any) {
      const r = error?.response;
      console.error("[sslCommerz] validatePayment error:", { status: r?.status, data: r?.data, message: error?.message });
      if (error?.isOperational && error?.statusCode) throw error;
      throw AppError.internalError("SSLCommerz validation failed");
    }
  }
};

export default SSLService;
