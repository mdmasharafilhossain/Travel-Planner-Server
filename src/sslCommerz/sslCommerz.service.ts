// src/modules/sslCommerz/sslCommerz.service.ts
import axios from "axios";
import dotenv from "dotenv";
import { AppError } from "../utils/AppError";
dotenv.config();

/**
 * Payload used to initialize SSLCommerz checkout
 */
export interface ISSLInitPayload {
  name: string;
  email: string;
  phoneNumber: string;
  address?: string;
  amount: number; // amount in BDT (whole number / decimal accepted by SSLCommerz)
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

/**
 * Minimal shape of SSLCommerz init response (we return the whole data,
 * but GatewayPageURL is the most important field)
 */
type TSSLInitResponse = any;

/**
 * SSLCommerz service wrapper
 * - sslPaymentInit: calls gateway to create a checkout and returns gateway response
 * - validatePayment: calls validation API (by val_id) and returns validation details
 *
 * NOTE:
 * - sslPaymentInit sends x-www-form-urlencoded payload as required by SSLCommerz
 * - validatePayment expects payload from IPN (req.body) and calls the validator API
 * - This module throws AppError on failure to make it easy for controllers to catch
 */
export const SSLService = {
  sslPaymentInit: async (payload: ISSLInitPayload): Promise<TSSLInitResponse> => {
    try {
      const data: Record<string, any> = {
        store_id: process.env.SSL_STORE_ID,
        store_passwd: process.env.SSL_STORE_PASS,
        total_amount: payload.amount,
        currency: "BDT",
        tran_id: payload.transactionId,
        success_url: `${process.env.SSL_SSL_SUCCESS_BACKEND_URL}?transactionId=${encodeURIComponent(
          payload.transactionId
        )}&amount=${encodeURIComponent(String(payload.amount))}&status=success`,
        fail_url: `${process.env.SSL_SSL_FAIL_BACKEND_URL}?transactionId=${encodeURIComponent(
          payload.transactionId
        )}&amount=${encodeURIComponent(String(payload.amount))}&status=fail`,
        cancel_url: `${process.env.SSL_SSL_CANCEL_BACKEND_URL}?transactionId=${encodeURIComponent(
          payload.transactionId
        )}&amount=${encodeURIComponent(String(payload.amount))}&status=cancel`,
        ipn_url: process.env.SSL_SSL_IPN_URL,
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

      // build x-www-form-urlencoded body
      const params = new URLSearchParams();
      Object.keys(data).forEach((k) => {
        const v = data[k];
        // ensure not undefined or null
        if (v === undefined || v === null) params.append(k, "");
        else params.append(k, String(v));
      });

      const response = await axios.post(process.env.SSL_PAYMENT_API as string, params.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000
      });

      if (!response || !response.data) {
        throw AppError.internalError("Empty response from SSLCommerz payment API");
      }

      // response.data typically contains GatewayPageURL, store_id, tran_id, etc.
      return response.data;
    } catch (error: any) {
      // log and convert to AppError so callers can handle uniformly
      const errInfo = error?.response?.data ?? error?.message ?? error;
      console.error("SSLCommerz sslPaymentInit error:", errInfo);
      throw AppError.internalError("SSLCommerz payment initialization failed");
    }
  },

  /**
   * Validate payment using SSLCommerz validation API.
   * `payload` should be the IPN body sent by SSLCommerz (contains val_id and tran_id)
   * Returns the validation API response object.
   */
  validatePayment: async (payload: Record<string, any>): Promise<any> => {
    try {
      const val_id = payload?.val_id;
      if (!val_id) {
        throw AppError.badRequest("val_id missing in IPN payload");
      }

      const url = `${process.env.SSL_VALIDATION_API}?val_id=${encodeURIComponent(
        val_id
      )}&store_id=${encodeURIComponent(process.env.SSL_STORE_ID as string)}&store_passwd=${encodeURIComponent(
        process.env.SSL_STORE_PASS as string
      )}`;

      const response = await axios.get(url, { timeout: 15000 });

      if (!response || !response.data) {
        throw AppError.internalError("Empty response from SSLCommerz validation API");
      }

      // response.data contains validation details (status, verify_sign, amount, etc.)
      return response.data;
    } catch (error: any) {
      const errInfo = error?.response?.data ?? error?.message ?? error;
      console.error("SSLCommerz validatePayment error:", errInfo);
      throw AppError.internalError("SSLCommerz payment validation failed");
    }
  }
};

export default SSLService;
