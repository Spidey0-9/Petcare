/**
 * StorageService — Supabase Storage wrapper for React Native / Expo.
 *
 * KEY DESIGN DECISION
 * -------------------
 * React Native's fetch() cannot read local file:// URIs returned by
 * expo-image-picker or expo-camera.  The old implementation called:
 *
 *   const response = await fetch(uri);   // ← always throws "Network request failed"
 *   return response.blob();
 *
 * The correct approach is to read the file via expo-file-system as Base64,
 * decode it to a Uint8Array, and hand the raw bytes directly to the Supabase
 * JS SDK.  This path requires no HTTP round-trip for the local file read.
 */

import * as FileSystem from 'expo-file-system';
import { supabase } from '../../core/services/supabase';
import { STORAGE_BUCKETS } from '../../constants';
import { AppError, throwIfError } from '../errors';

// ── Types ─────────────────────────────────────────────────────────────────────

export type UploadFile = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a deterministic storage object path.
 * Format: <prefix>/<timestamp>-<sanitised-filename>
 * Example: "abc123/pet-id/1720000000000-Buddy-profile.jpg"
 */
function buildStoragePath(prefix: string, fileName?: string | null): string {
  const cleanName = fileName?.replace(/[^a-zA-Z0-9._-]/g, '-') || `upload-${Date.now()}`;
  return `${prefix}/${Date.now()}-${cleanName}`;
}

/**
 * Read a local file URI into a Uint8Array via expo-file-system.
 *
 * Why expo-file-system instead of fetch()?
 * -----------------------------------------
 * React Native's Fetch API delegates to the native networking layer which
 * handles HTTP/HTTPS only.  It has no filesystem handler, so any request to a
 * file:// URI immediately throws "Network request failed" — the error is
 * emitted before the request even leaves JavaScript.
 *
 * expo-file-system.readAsStringAsync() reads directly from the device
 * filesystem (bypassing the network stack) and returns Base64-encoded data
 * which we decode into a Uint8Array.
 *
 * @throws {AppError} with full URI in message if the file cannot be read.
 */
async function uriToUint8Array(uri: string): Promise<Uint8Array> {
  let base64: string;
  try {
    base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (fsErr: any) {
    throw new AppError(
      `[StorageService] Failed to read local file — ${fsErr?.message ?? String(fsErr)}. URI: ${uri}`,
      'FILE_READ_ERROR',
      { uri },
    );
  }

  if (!base64) {
    throw new AppError(
      `[StorageService] File read returned empty data. URI: ${uri}`,
      'FILE_EMPTY',
      { uri },
    );
  }

  // Decode Base64 → binary string → Uint8Array
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// ── StorageService class ──────────────────────────────────────────────────────

export class StorageService {
  /**
   * Upload a Uint8Array to a Supabase Storage bucket.
   * All other upload methods ultimately call this one.
   *
   * On error, throws an AppError that includes:
   *   - Supabase error message
   *   - Supabase error status code
   *   - bucket name
   *   - object path
   *   - content-type
   */
  async uploadBytes(
    bucket: string,
    path: string,
    data: Uint8Array,
    contentType = 'application/octet-stream',
  ): Promise<string> {
    console.log(
      `[StorageService] uploadBytes → bucket="${bucket}" path="${path}" ` +
      `contentType="${contentType}" size=${data.byteLength}B`,
    );

    const { error } = await supabase.storage.from(bucket).upload(path, data, {
      contentType,
      upsert: true,
    });

    if (error) {
      // Surface the full Supabase error so the caller (and developer) can see
      // exactly what went wrong — bucket name, path, status, message, hint.
      const detail = {
        bucket,
        path,
        contentType,
        supabaseMessage: error.message,
        // StorageError may carry status / statusCode / error / cause
        supabaseStatus: (error as any).status ?? (error as any).statusCode ?? 'unknown',
        supabaseError:  (error as any).error ?? (error as any).cause ?? null,
      };
      console.error('[StorageService] Upload failed:', detail);
      throw new AppError(
        `Storage upload failed (bucket="${bucket}", path="${path}"): ${error.message}`,
        'UPLOAD_ERROR',
        detail,
      );
    }

    const publicUrl = this.getPublicUrl(bucket, path);
    console.log(`[StorageService] Upload success → publicUrl="${publicUrl}"`);
    return publicUrl;
  }

  /**
   * Primary method — upload a local file URI (from expo-image-picker or
   * expo-camera) to a Supabase Storage bucket.
   *
   * On error, logs and re-throws an AppError that includes:
   *   - file URI
   *   - bucket name
   *   - computed object path
   *   - MIME type
   *   - Supabase error details
   */
  async uploadFile(bucket: string, prefix: string, file: UploadFile): Promise<string> {
    const path        = buildStoragePath(prefix, file.fileName);
    const contentType = file.mimeType ?? 'image/jpeg';

    console.log(
      `[StorageService] uploadFile → uri="${file.uri}" ` +
      `bucket="${bucket}" path="${path}" contentType="${contentType}"`,
    );

    let bytes: Uint8Array;
    try {
      bytes = await uriToUint8Array(file.uri);
    } catch (readErr: any) {
      // Re-throw with added upload context so callers see both file + bucket info
      console.error('[StorageService] File read error:', {
        uri:         file.uri,
        bucket,
        path,
        contentType,
        error:       readErr?.message ?? readErr,
      });
      throw readErr;
    }

    try {
      return await this.uploadBytes(bucket, path, bytes, contentType);
    } catch (uploadErr: any) {
      console.error('[StorageService] Upload error details:', {
        uri:         file.uri,
        bucket,
        path,
        contentType,
        size:        bytes.byteLength,
        error:       uploadErr?.message ?? uploadErr,
        details:     uploadErr?.details ?? null,
      });
      throw uploadErr;
    }
  }

  /**
   * Return the public URL for an already-uploaded object.
   * Does not make a network request — the URL is constructed locally.
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Delete one or more objects from a bucket.
   */
  async remove(bucket: string, paths: string[]): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    throwIfError(error, `Unable to delete file(s) from bucket "${bucket}".`);
  }

  /**
   * @deprecated Blobs are unreliable in React Native (no guaranteed binary
   * fidelity).  Use uploadFile() which reads via expo-file-system instead.
   */
  async uploadBlob(
    bucket: string,
    path: string,
    blob: Blob,
    contentType = 'application/octet-stream',
  ): Promise<string> {
    console.warn(
      '[StorageService] uploadBlob() is deprecated in React Native. ' +
      'Use uploadFile() to avoid potential binary corruption.',
    );
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    return this.uploadBytes(bucket, path, bytes, contentType);
  }
}

export const storageService = new StorageService();
export { STORAGE_BUCKETS };
