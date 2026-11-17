import { AwsClient } from "aws4fetch";

/**
 * Object storage for chat photos and voice notes: any S3-compatible bucket (Cloudflare R2 planned).
 * Set S3_ENDPOINT (e.g. https://<account>.r2.cloudflarestorage.com), S3_BUCKET, S3_ACCESS_KEY_ID,
 * S3_SECRET_ACCESS_KEY and optionally S3_REGION ("auto" for R2). Without S3_BUCKET, files stay in the database
 * (Attachment.data) with a total size cap, which is the interim mode until the bucket exists.
 * The bucket must be private: files are only ever served through the server, after the access check.
 */
export type Driver = "db" | "s3";
export const storageDriver = (): Driver => (process.env.S3_BUCKET && process.env.S3_ENDPOINT ? "s3" : "db");

let client: AwsClient | null = null;
function s3() {
  if (!client) {
    const accessKeyId = process.env.S3_ACCESS_KEY_ID, secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) throw new Error("S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are not set");
    client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: process.env.S3_REGION || "auto" });
  }
  return client;
}
const objectUrl = (key: string) => `${process.env.S3_ENDPOINT!.replace(/\/$/, "")}/${process.env.S3_BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;

async function call(method: "PUT" | "GET" | "DELETE", key: string, body?: Uint8Array, mime?: string): Promise<Response> {
  const res = await s3().fetch(objectUrl(key), {
    method,
    body: body ? new Uint8Array(body) : undefined,
    headers: mime ? { "content-type": mime } : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok && !(method === "DELETE" && res.status === 404)) throw new Error(`storage ${method} failed: HTTP ${res.status}`);
  return res;
}

export async function putObject(key: string, body: Uint8Array, mime: string) { await call("PUT", key, body, mime); }
export async function getObject(key: string): Promise<Uint8Array> { return new Uint8Array(await (await call("GET", key)).arrayBuffer()); }
export async function deleteObject(key: string) { await call("DELETE", key); }
