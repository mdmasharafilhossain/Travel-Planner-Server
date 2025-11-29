// import { PrismaClient } from "@prisma/client";

// export const prisma = new PrismaClient()
import { PrismaClient } from "@prisma/client";
// adapter for Postgres
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!, 
});

export const prisma = new PrismaClient({ adapter });
