import dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";

import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!, 
  
 
});
console.log(process.env.DATABASE_URL,"database_url");
export const prisma = new PrismaClient({ adapter });
