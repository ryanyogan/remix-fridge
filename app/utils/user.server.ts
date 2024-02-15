import crypto from "crypto";
import { db } from "./prisma.server";
import { RegisterForm } from "./types.server";

export async function createUser(user: RegisterForm) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(user.password, salt, 1_000, 64, "sha256")
    .toString("hex");

  const newUser = await db.user.create({
    data: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: {
        create: { hash, salt },
      },
    },
  });

  return { id: newUser.id, email: newUser.email };
}
