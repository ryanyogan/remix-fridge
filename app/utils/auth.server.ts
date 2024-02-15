import { json } from "@remix-run/node";
import crypto from "crypto";
import { db } from "./prisma.server";
import type { LoginForm, RegisterForm } from "./types.server";
import { createUser } from "./user.server";

export async function register(user: RegisterForm) {
  const exists = await db.user.count({ where: { email: user.email } });
  if (exists) {
    return json(
      { error: "User already exists with that email" },
      { status: 400 }
    );
  }

  const newUser = await createUser(user);
  if (!newUser) {
    return json(
      {
        error: "Something went wrong trying to create a new user.",
        fields: { email: user.email, password: user.password },
      },
      { status: 400 }
    );
  }
}

export async function login({ email, password }: LoginForm) {
  const user = await db.user.findUnique({
    where: { email },
    include: { password: true },
  });

  if (!user || !user.password) {
    return json({ error: "Incorrect login" }, { status: 400 });
  }

  const hash = crypto
    .pbkdf2Sync(password, user.password.salt, 1_000, 64, "sha256")
    .toString("hex");

  if (hash !== user.password.hash) {
    return json({ error: "Incorrect Login" }, { status: 400 });
  }

  return json({ id: user.id, email });
}

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.warn("No SESSION_SECRET found in .env, generating a random one");
  sessionSecret = crypto.randomBytes(32).toString("hex");
}
