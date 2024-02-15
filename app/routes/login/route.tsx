import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import { Form } from "@remix-run/react";
import { useState } from "react";
import { FormField } from "~/componenets/form-field";
import { Layout } from "~/componenets/layout";
import { getUser, login, register } from "~/utils/auth.server";
import {
  validateEmail,
  validateName,
  validatePassword,
} from "~/utils/validators.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return (await getUser(request)) ? redirect("/") : null;
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const intent = form.get("intent");
  const email = form.get("email");
  const password = form.get("password");
  let firstName = form.get("firstName");
  let lastName = form.get("lastName");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof intent !== "string"
  ) {
    return json(
      { error: "Invalid form submission", form: intent },
      { status: 400 }
    );
  }

  if (
    (intent === "register" && typeof firstName !== "string") ||
    typeof lastName !== "string"
  ) {
    return json(
      { error: "Invalid form submission", form: intent },
      { status: 400 }
    );
  }

  const errors = {
    email: validateEmail(email),
    password: validatePassword(password),
    ...(intent === "register" && {
      firstName: validateName(firstName as string),
      lastName: validateName(lastName as string),
    }),
  };

  if (Object.values(errors).some(Boolean)) {
    return json(
      { errors, firelds: { email, password, firstName, lastName } },
      { status: 400 }
    );
  }

  switch (intent) {
    case "login": {
      return await login({ email, password });
    }

    case "register": {
      firstName = firstName as string;
      lastName = lastName as string;
      return await register({ email, password, firstName, lastName });
    }

    default: {
      return json(
        { error: "Invalid form submission", form: intent },
        { status: 400 }
      );
    }
  }
}

export default function Login() {
  const [intent, setIntent] = useState<string>("login");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    field: string
  ) => {
    setFormData((form) => ({ ...form, [field]: event.target.value }));
  };

  return (
    <Layout>
      <div className="h-full justify-center items-center flex flex-col gap-y-4">
        <button
          onClick={() => setIntent(intent === "login" ? "register" : "login")}
          className="absolute top-8 right-8 rounded-xl bg-yellow-300 font-semibold text-blue-600 px-3 py-2 transition duration-300 ease-in-out hover:bg-yellow-400 hover:-translate-y-1"
        >
          {intent === "login" ? "Register" : "Log In"}
        </button>

        <h2 className="text-5xl font-bold text-yellow-300">
          Welcome to Fridge
        </h2>
        <p className="font-semibold text-slate-300">
          {intent === "login"
            ? "Log In To Give Some Praise!"
            : "Sign Up To Get Started!"}
        </p>

        <Form method="post" className="rounded-2xl bg-gray-200 p-6 w-96">
          <input type="hidden" name="intent" value={intent} />
          <FormField
            htmlFor="email"
            label="Email"
            onChange={(e) => handleInputChange(e, "email")}
            value={formData.email}
          />

          <FormField
            htmlFor="password"
            label="Password"
            type="password"
            onChange={(e) => handleInputChange(e, "password")}
            value={formData.password}
          />

          {intent === "register" && (
            <>
              <FormField
                htmlFor="firstName"
                label="First Name"
                onChange={(e) => handleInputChange(e, "firstName")}
                value={formData.firstName}
              />
              <FormField
                htmlFor="lastName"
                label="Last Name"
                onChange={(e) => handleInputChange(e, "lastName")}
                value={formData.lastName}
              />
            </>
          )}

          <div className="w-full text-center">
            <button
              type="submit"
              className="rounded-xl mt-2 bg-yellow-300 px-3 py-2 text-blue-600 font-semibold transition duration-300 ease-in-out hover:bg-yellow-400 hover:-translate-y-1"
            >
              {intent === "login" ? "Log In" : "Register"}
            </button>
          </div>
        </Form>
      </div>
    </Layout>
  );
}
