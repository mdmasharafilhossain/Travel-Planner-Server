import { AppError } from "../../utils/AppError";
import { userModel } from "./user.model";
import bcrypt from "bcryptjs";

export async function getUserById(id: string) {
  const user = await userModel.findById(id);
  if (!user) throw { statusCode: 404, message: "User not found" };

  // @ts-ignore
  delete user.password;
  return user;
}

export async function updateUser(id: string, data: any) {
  const updated = await userModel.update(id, data);
  // @ts-ignore
  delete updated.password;
  return updated;
}

// export async function listUsers(take = 20, skip = 0) {
//   const users = await userModel.list(take, skip);
//   return users.map(u => {
//     // @ts-ignore
//     delete u.password;
//     return u;
//   });
// }
export async function listUsers(take = 10, skip = 0) {
  const [users, total] = await Promise.all([
    userModel.list(take, skip),
    userModel.count(),
  ]);

  return {
    users: users.map(u => {
      // @ts-ignore
      delete u.password;
      return u;
    }),
    total,
  };
}


export async function changePassword(id: string, oldPassword: string, newPassword: string) {
  const user = await userModel.findById(id);
  if (!user){
throw AppError.notFound("User not found");
  } 
  const checkPassword = await bcrypt.compare(oldPassword, user.password);
  if (!checkPassword){
throw AppError.badRequest("Old password is incorrect");
  } ;
  const hash = await bcrypt.hash(newPassword, Number(process.env.SALT_ROUNDS) || 10);
  await userModel.update(id, { password: hash });
  return {
     message: "Password updated" 
    
    };
}
export async function getMe(id: string) {
  
  const user = await userModel.findByIdSafe(id);
  
  if (!user) throw AppError.notFound("User not found");
  return user;
}




export async function deleteUser(id: string) {
  const user = await userModel.findById(id);
  if (!user) throw AppError.notFound("User not found");
   

  const deleted = await userModel.delete(id);
  // @ts-ignore
  delete deleted.password;
  return { message: "User deleted", user: deleted };
}


export async function changeUserRole(id: string, role: "USER" | "ADMIN") {
  const user = await userModel.findById(id);
  if (!user) throw AppError.notFound("User not found");

  if (!["USER", "ADMIN"].includes(role)) {
    throw AppError.badRequest("Invalid role");
  }

  const updated = await userModel.update(id, { role });
  // @ts-ignore
  delete updated.password;
  return { message: "Role updated", user: updated };
}