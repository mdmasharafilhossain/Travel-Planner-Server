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

export async function listUsers(take = 20, skip = 0) {
  const users = await userModel.list(take, skip);
  return users.map(u => {
    // @ts-ignore
    delete u.password;
    return u;
  });
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
