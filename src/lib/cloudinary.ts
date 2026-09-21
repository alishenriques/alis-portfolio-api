import { v2 as cloudinary } from "cloudinary";
import type { Env } from "../schemas/domain.js";

export type CloudinaryClient = typeof cloudinary;

export const UPLOAD_FOLDER = "alis-portfolio";

export function createCloudinary(env: Env): CloudinaryClient | null {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    return null;
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
}

/**
 * Signs an upload so the browser can send the file straight to Cloudinary
 * (keeps the API secret server-side and the file out of the serverless function).
 */
export function signUpload(client: CloudinaryClient, env: Env, now = Date.now()) {
  const timestamp = Math.floor(now / 1000);
  const params = { timestamp, folder: UPLOAD_FOLDER };
  const signature = client.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET ?? "");

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: env.CLOUDINARY_API_KEY ?? "",
    timestamp,
    folder: UPLOAD_FOLDER,
    signature,
  };
}
