import "server-only";

import { redirect } from "next/navigation";
import {
  AuthenticationRequiredError,
  AuthorizationError,
  requireAdminUser,
} from "@/features/auth/server";

export async function requireAdminPageUser() {
  try {
    return await requireAdminUser();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/sign-in");
    }
    if (error instanceof AuthorizationError) {
      redirect("/dashboard");
    }
    throw error;
  }
}
