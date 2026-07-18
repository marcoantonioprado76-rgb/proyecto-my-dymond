/**
 * Almacenamiento de archivos — AWS S3 (shim con la misma API que Supabase Storage).
 *
 * Los ~23 archivos de la app usan `supabaseAdmin.storage.from(bucket).{upload,
 * getPublicUrl,remove,createSignedUrl,createSignedUploadUrl}` y `.storage.
 * {listBuckets,createBucket}` tal cual. Este módulo re-implementa exactamente esa
 * superficie sobre S3, así que NINGÚN caller necesita cambiar.
 *
 * El "bucket lógico" (uploads, ad-creatives, course-videos, broadcast-images,
 * social-media) se mapea al bucket real de S3 con el prefijo de la cuenta:
 *     bucket real = `${S3_BUCKET_PREFIX}${lógico}`   (ej. agentenuro-1234-uploads)
 *
 * Config por variables de entorno (solo servidor):
 *   S3_BUCKET_PREFIX   — ej. "agentenuro-<ACCOUNT_ID>-"
 *   AWS_REGION         — ej. "us-east-1"
 *   Credenciales: cadena por defecto del SDK (instance profile del EC2 en prod;
 *   AWS_PROFILE/keys en local). Nunca se exponen al navegador.
 *
 * Nota: el rol IAM del EC2 solo permite Get/Put/Delete/ListBucket sobre estos
 * buckets; NO permite crear buckets ni listar todos. Por eso `listBuckets`,
 * `createBucket` y `ensureBucket` NO llaman a S3 — los buckets los provisiona
 * `deploy/01-buckets.sh`. Se resuelven de forma estática.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const REGION = process.env.AWS_REGION || 'us-east-1'
const BUCKET_PREFIX = process.env.S3_BUCKET_PREFIX || ''

if (!BUCKET_PREFIX) {
  console.warn(
    '[storage] Falta S3_BUCKET_PREFIX — las subidas/borrados de archivos fallarán.'
  )
}

/** Buckets que usa la app (nombres lógicos, sin el prefijo de cuenta). */
const KNOWN_BUCKETS = ['uploads', 'ad-creatives', 'course-videos', 'broadcast-images', 'social-media']

/** Bucket real de S3 a partir del nombre lógico. */
function realBucket(logical: string): string {
  return `${BUCKET_PREFIX}${logical}`
}

/** URL pública de un objeto (buckets públicos). Preserva las "/" del key. */
function publicUrlFor(logical: string, key: string): string {
  const encoded = String(key).split('/').map(encodeURIComponent).join('/')
  return `https://${realBucket(logical)}.s3.${REGION}.amazonaws.com/${encoded}`
}

const s3 = new S3Client({ region: REGION })

type StorageResult<T = any> = { data: T | null; error: { message: string } | null }

/** Operaciones sobre un bucket lógico — misma firma que Supabase Storage. */
function from(logical: string) {
  const Bucket = realBucket(logical)

  return {
    /** Sube un objeto. `opts.upsert === false` => error si ya existe (como Supabase). */
    async upload(
      path: string,
      body: Buffer | Uint8Array | ArrayBuffer | Blob | string,
      opts?: { contentType?: string; cacheControl?: string; upsert?: boolean }
    ): Promise<StorageResult<{ path: string }>> {
      try {
        if (opts?.upsert === false) {
          try {
            await s3.send(new HeadObjectCommand({ Bucket, Key: path }))
            return { data: null, error: { message: 'The resource already exists' } }
          } catch {
            /* no existe -> seguimos */
          }
        }
        let Body: Buffer | Uint8Array | string
        if (body instanceof Blob) Body = Buffer.from(await body.arrayBuffer())
        else if (body instanceof ArrayBuffer) Body = Buffer.from(body)
        else Body = body as Buffer | Uint8Array | string

        await s3.send(
          new PutObjectCommand({
            Bucket,
            Key: path,
            Body,
            ContentType: opts?.contentType,
            CacheControl: opts?.cacheControl,
          })
        )
        return { data: { path }, error: null }
      } catch (e: any) {
        return { data: null, error: { message: e?.message || 'upload failed' } }
      }
    },

    /** URL pública (síncrono, igual que Supabase). */
    getPublicUrl(path: string): { data: { publicUrl: string } } {
      return { data: { publicUrl: publicUrlFor(logical, path) } }
    },

    /** Borra uno o varios objetos. */
    async remove(paths: string[]): Promise<StorageResult> {
      try {
        if (!paths?.length) return { data: [], error: null }
        await s3.send(
          new DeleteObjectsCommand({
            Bucket,
            Delete: { Objects: paths.map(Key => ({ Key })), Quiet: true },
          })
        )
        return { data: paths.map(p => ({ name: p })), error: null }
      } catch (e: any) {
        return { data: null, error: { message: e?.message || 'remove failed' } }
      }
    },

    /** URL firmada de LECTURA (buckets privados, ej. course-videos). */
    async createSignedUrl(
      key: string,
      expiresIn: number
    ): Promise<StorageResult<{ signedUrl: string }>> {
      try {
        const signedUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket, Key: key }),
          { expiresIn }
        )
        return { data: { signedUrl }, error: null }
      } catch (e: any) {
        return { data: null, error: { message: e?.message || 'sign failed' } }
      }
    },

    /** URL firmada de SUBIDA (PUT directo desde el navegador). */
    async createSignedUploadUrl(
      path: string
    ): Promise<StorageResult<{ signedUrl: string; path: string; token: string }>> {
      try {
        const signedUrl = await getSignedUrl(
          s3,
          new PutObjectCommand({ Bucket, Key: path }),
          { expiresIn: 60 * 60 } // 1h para subir el video
        )
        return { data: { signedUrl, path, token: '' }, error: null }
      } catch (e: any) {
        return { data: null, error: { message: e?.message || 'sign upload failed' } }
      }
    },
  }
}

/**
 * Cliente de almacenamiento con la misma forma que `supabaseAdmin` de Supabase.
 * `listBuckets`/`createBucket` se resuelven estáticos (los buckets los crea la
 * infra; el rol del EC2 no tiene permiso para crearlos/listarlos).
 */
export const supabaseAdmin = {
  storage: {
    from,
    async listBuckets(): Promise<StorageResult<{ name: string }[]>> {
      return { data: KNOWN_BUCKETS.map(name => ({ name })), error: null }
    },
    async createBucket(
      name: string,
      _opts?: { public?: boolean; fileSizeLimit?: number | string; allowedMimeTypes?: string[] }
    ): Promise<StorageResult<{ name: string }>> {
      // No-op: los buckets se provisionan con deploy/01-buckets.sh.
      return { data: { name }, error: null }
    },
  },
}

export const supabase = supabaseAdmin

/** Borra un archivo del bucket 'uploads' a partir de su URL pública. */
export async function deleteUploadByUrl(url: string | null | undefined) {
  if (!url) return
  try {
    const key = keyFromUrl(url, 'uploads')
    if (key) await supabaseAdmin.storage.from('uploads').remove([key])
  } catch (e) {
    console.error('[deleteUploadByUrl]', e)
  }
}

/**
 * Borra un archivo a partir de su URL pública, en CUALQUIER bucket de la app.
 * Ignora URLs que no sean nuestras (ej. YouTube, enlaces externos).
 * Úsese al reemplazar/eliminar archivos (videos de cursos, portadas, etc.) para no
 * dejar huérfanos.
 */
export async function deleteFileByUrl(url: string | null | undefined) {
  if (!url) return
  try {
    const parsed = parseStorageUrl(url)
    if (!parsed) return
    await supabaseAdmin.storage.from(parsed.bucket).remove([parsed.key])
  } catch (e) {
    console.error('[deleteFileByUrl]', e)
  }
}

/**
 * Extrae bucket (lógico) y key de una URL de storage. Soporta:
 *   - S3:  https://<prefix><bucket>.s3.<region>.amazonaws.com/<key>
 *   - S3 (path-style): https://s3.<region>.amazonaws.com/<prefix><bucket>/<key>
 *   - Legacy Supabase: .../storage/v1/object/(public|sign)/<bucket>/<key>
 * Devuelve null si la URL no es de nuestro storage.
 */
function parseStorageUrl(url: string): { bucket: string; key: string } | null {
  // Legacy Supabase (por si quedan URLs viejas sin reescribir).
  const supa = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/)
  if (supa) return { bucket: decodeURIComponent(supa[1]), key: decodeURIComponent(supa[2]) }

  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (!/\.amazonaws\.com$/.test(u.hostname) && !/^s3[.-]/.test(u.hostname)) return null

  // Virtual-hosted:  <realBucket>.s3.<region>.amazonaws.com/<key>
  const vh = u.hostname.match(/^(.+?)\.s3[.-]/)
  if (vh) {
    const logical = stripPrefix(vh[1])
    if (logical) return { bucket: logical, key: decodeURIComponent(u.pathname.replace(/^\//, '')) }
  }
  // Path-style:  s3.<region>.amazonaws.com/<realBucket>/<key>
  const parts = u.pathname.replace(/^\//, '').split('/')
  if (parts.length >= 2) {
    const logical = stripPrefix(parts[0])
    if (logical) return { bucket: logical, key: decodeURIComponent(parts.slice(1).join('/')) }
  }
  return null
}

/** Quita el prefijo de cuenta de un bucket real y valida que sea uno conocido. */
function stripPrefix(realName: string): string | null {
  const logical = BUCKET_PREFIX && realName.startsWith(BUCKET_PREFIX)
    ? realName.slice(BUCKET_PREFIX.length)
    : realName
  return KNOWN_BUCKETS.includes(logical) ? logical : null
}

/** Igual que parseStorageUrl pero exigiendo un bucket concreto. */
function keyFromUrl(url: string, bucket: string): string | null {
  const parsed = parseStorageUrl(url)
  return parsed && parsed.bucket === bucket ? parsed.key : null
}

/** Compat: antes creaba el bucket si no existía. Ahora los crea la infra (no-op). */
export async function ensureBucket(_name: string, _isPublic = true) {
  return
}

export { KNOWN_BUCKETS }
