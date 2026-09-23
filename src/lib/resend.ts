import { Resend } from "resend";
import type { Env } from "../schemas/domain.js";

export function createResend(env: Env) {
  if (!env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(env.RESEND_API_KEY);
}
