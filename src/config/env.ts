import { z } from "zod";

const envSchema = z.object({
  // Empty means same origin: the dev server or the production reverse proxy forwards
  // /identity and /assessment to the API gateway. Only set it for a gateway on another origin.
  VITE_API_BASE_URL: z
    .union([z.literal(""), z.string().url()])
    .optional()
    .transform((value) => (value ?? "").replace(/\/+$/, "")),
});

const parsedEnv = envSchema.parse(import.meta.env);

export const env = {
  apiBaseUrl: parsedEnv.VITE_API_BASE_URL,
} as const;
