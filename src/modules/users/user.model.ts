import { prisma } from "../../config/db";


export const userModel = {
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  create: (data: any) => prisma.user.create({ data }),
  update: (id: string, data: any) => prisma.user.update({ where: { id }, data }),
  list: (take = 20, skip = 0) => prisma.user.findMany({ take, skip })
};
