import { z } from "zod";
import { parseRupeesToPaise } from "@/lib/money.mjs";

export { parseRupeesToPaise };

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid record ID.");
