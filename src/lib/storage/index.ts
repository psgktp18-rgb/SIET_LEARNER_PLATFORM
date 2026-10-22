import { env } from '../env';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface StorageProvider {
  uploadFile(buffer: Buffer, originalName: string, mimeType: string): Promise<{ key: string; size: number }>;
  getFileUrl(key: string, expiresInSecs?: number): Promise<string>;
  deleteFile(key: string): Promise<void>;
  downloadFile(key: string): Promise<Buffer>;
}

class LocalDiskStorage implements StorageProvider {
  private baseDir = path.join(process.cwd(), 'uploads');

  constructor() {
    fs.mkdir(this.baseDir, { recursive: true }).catch(console.error);
  }

  async uploadFile(buffer: Buffer, originalName: string, mimeType: string) {
    const ext = path.extname(originalName) || '';
    const key = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(this.baseDir, key);
    await fs.writeFile(filePath, buffer);
    return { key, size: buffer.length };
  }

  async getFileUrl(key: string) {
    // In local dev, we serve via the API route directly.
    return `/api/files/${key}`;
  }

  async deleteFile(key: string) {
    const filePath = path.join(this.baseDir, key);
    await fs.unlink(filePath).catch(() => {});
  }

  async downloadFile(key: string) {
    const filePath = path.join(this.baseDir, key);
    return await fs.readFile(filePath);
  }
}

// A simple mock for Firebase Admin Storage if needed later, right now LocalDisk works for both if we don't have Firebase configured.
class FirebaseStorage implements StorageProvider {
  async uploadFile(buffer: Buffer, originalName: string, mimeType: string): Promise<{ key: string; size: number }> {
     throw new Error("Firebase Storage Provider not implemented fully yet.");
  }
  async getFileUrl(key: string, expiresInSecs?: number): Promise<string> {
     throw new Error("Not implemented");
  }
  async deleteFile(key: string): Promise<void> {}
  async downloadFile(key: string): Promise<Buffer> { throw new Error("Not implemented"); }
}

export const storage: StorageProvider = process.env.STORAGE_PROVIDER === 'firebase' 
  ? new FirebaseStorage() 
  : new LocalDiskStorage();
