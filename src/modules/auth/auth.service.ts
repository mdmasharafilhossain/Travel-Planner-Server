import { prisma } from "../../config/db";
import { signJwt } from "../../config/jwt";
import { AppError } from "../../utils/AppError";
import bcrypt from 'bcryptjs';

export async function registerUser(payload: { email: string, password: string, fullName?: string }) {


    const isUserExist = await prisma.user.findUnique(
        {
            where: { email: payload.email }
        }
    );

    if (isUserExist) {
        throw AppError.conflict("User with this email already exists");
    }

    const hashPassWord = await bcrypt.hash(payload.password, Number(process.env.SALT_ROUNDS) || 10);

    const createNewUser = await prisma.user.create(
        {
            data: {
                email: payload.email,
                password: hashPassWord,
                fullName: payload.fullName || "N/A"
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
            }


        }
    )

    const token = signJwt({ id: createNewUser.id, email: createNewUser.email, role: createNewUser.role });

    return { user: createNewUser, token };

}

export async function loginUser(payload: { email: string; password: string }) {
    const user = await prisma.user.findUnique(
        {
            where:
            {
                email: payload.email
            }
        }
    );
    if (!user) {
        throw AppError.badRequest("Invalid credentials..");
    }

   const valid = await bcrypt.compare(payload.password, user.password);
    if (!valid) {
        throw AppError.badRequest("Password not matched...Try again!");
    };
    const token = signJwt(
        { id: user.id, email: user.email, role: user.role }
    );
    return {
         user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }, token };
}
