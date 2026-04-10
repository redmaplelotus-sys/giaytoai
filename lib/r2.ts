import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { serverEnv } from "@/lib/server-env";

// ---------------------------------------------------------------------------
// Client
//
// Cloudflare R2 is S3-compatible. The only required divergence from standard
// S3 is the custom endpoint and region "auto".
// ---------------------------------------------------------------------------

let _client: S3Client | null = null;
let _bucket: string | null  = null;

function getClient(): { client: S3Client; bucket: string } {
  if (!_client) {
    const { cfAccountId, cfR2AccessKeyId, cfR2SecretAccessKey, cfR2BucketName } = serverEnv;
    if (!cfAccountId || !cfR2AccessKeyId || !cfR2SecretAccessKey || !cfR2BucketName) {
      throw new Error("R2 is not configured. Set CF_ACCOUNT_ID, CF_R2_ACCESS_KEY_ID, CF_R2_SECRET_ACCESS_KEY, and CF_R2_BUCKET_NAME.");
    }
    _client = new S3Client({
      region:   "auto",
      endpoint: `https://${cfAccountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfR2AccessKeyId, secretAccessKey: cfR2SecretAccessKey },
    });
    _bucket = cfR2BucketName;
  }
  return { client: _client, bucket: _bucket! };
}

/** Raw S3Client — only available once R2 env vars are set. */
export const r2 = new Proxy({} as S3Client, {
  get(_, prop) { return getClient().client[prop as keyof S3Client]; },
});

// ---------------------------------------------------------------------------
// uploadToR2()
//
// Uploads a Buffer (or Uint8Array / string) to R2.
// Returns the key that was written — pass it to getSignedUrl() or deleteFromR2().
//
// Usage:
//   const key = await uploadToR2("uploads/user123/doc.pdf", buffer, "application/pdf");
// ---------------------------------------------------------------------------

export async function uploadToR2(
  key:         string,
  body:        Buffer | Uint8Array | string,
  contentType: string,
  metadata?:   Record<string, string>,
): Promise<string> {
  const { client, bucket } = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket:      bucket,
      Key:         key,
      Body:        body,
      ContentType: contentType,
      ...(metadata && { Metadata: metadata }),
    }),
  );
  return key;
}

// ---------------------------------------------------------------------------
// getSignedUrl()
//
// Returns a pre-signed GET URL valid for 24 hours (86 400 s).
// The URL works without any auth headers — safe to hand directly to a browser
// or email link.
//
// Optionally pass expiresInSeconds to override the 24-hour default.
//
// Usage:
//   const url = await getSignedUrl("uploads/user123/doc.pdf");
//   // → "https://…r2.cloudflarestorage.com/uploads/…?X-Amz-Signature=…"
// ---------------------------------------------------------------------------

const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export async function getSignedUrl(
  key:               string,
  expiresInSeconds?: number,
): Promise<string> {
  const { client, bucket } = getClient();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return awsGetSignedUrl(client, command, {
    expiresIn: expiresInSeconds ?? DEFAULT_TTL_SECONDS,
  });
}

// ---------------------------------------------------------------------------
// deleteFromR2()
//
// Permanently removes an object. R2 returns 204 whether the key existed or
// not, so this is always idempotent.
//
// Usage:
//   await deleteFromR2("uploads/user123/doc.pdf");
// ---------------------------------------------------------------------------

export async function deleteFromR2(key: string): Promise<void> {
  const { client, bucket } = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// ---------------------------------------------------------------------------
// existsInR2()
//
// Returns true if the key exists in the bucket (HEAD request, no data transfer).
// ---------------------------------------------------------------------------

export async function existsInR2(key: string): Promise<boolean> {
  const { client, bucket } = getClient();
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    // NoSuchKey or 403 when the object doesn't exist
    const code = (err as { name?: string })?.name;
    if (code === "NotFound" || code === "NoSuchKey" || code === "403") return false;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// downloadFromR2()
//
// Downloads an object body as a Buffer. Use for server-side processing only —
// for user-facing downloads prefer getSignedUrl() instead.
// ---------------------------------------------------------------------------

export async function downloadFromR2(key: string): Promise<Buffer> {
  const { client, bucket } = getClient();
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error(`R2: object "${key}" returned no body`);
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// ---------------------------------------------------------------------------
// r2Key()
//
// Canonical key layout: {prefix}/{userId}/{sessionId}/{uuid}.{ext}
//
// Organises objects by prefix so bucket-level lifecycle rules can target
// each type independently (e.g. delete uploads after 90 days, keep exports
// for 1 year).
//
// Usage:
//   const key = r2Key("uploads", userId, sessionId, "cv.pdf");
//   // → "uploads/user_2a…/sess_4f…/3e7c….pdf"
// ---------------------------------------------------------------------------

export function r2Key(
  prefix:    string,
  userId:    string,
  sessionId: string,
  filename:  string,
): string {
  const ext  = filename.includes(".") ? filename.split(".").pop()! : "bin";
  const uuid = crypto.randomUUID();
  return `${prefix}/${userId}/${sessionId}/${uuid}.${ext}`;
}
