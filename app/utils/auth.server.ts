import { createCookieSessionStorage, json, redirect } from "@remix-run/node";
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

  return createUserSession(newUser.id, "/");
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

  return createUserSession(user.id, "/");
}

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.warn(
    "No SESSION_SECRET found in .env, generating a random one... dangerous, " +
      "fix this in production, every deploy will kill all user sessions!"
  );
  sessionSecret = crypto.randomBytes(32).toString("hex");
}

const storage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
  },
});

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await storage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams.toString()}`);
  }

  return userId;
}

function getUserSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") {
    return null;
  }
  return userId;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (typeof userId !== "string") {
    return null;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    return user;
  } catch {
    throw logout(request);
  }
}

export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}
