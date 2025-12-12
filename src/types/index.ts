import express from "express";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
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