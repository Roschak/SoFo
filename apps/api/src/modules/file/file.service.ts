import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { env } from '../../shared/env';
import { forbidden, notFound } from '@sofo/shared';

export interface UploadedFileInfo {
  readonly id: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

export interface FileListItem {
  readonly id: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly uploaderId: string;
  readonly uploaderName: string | null;
  readonly createdAt: string;
}

export interface FileDownload {
  readonly stream: import('node:fs').ReadStream;
  readonly fileName: string;
  readonly mimeType: string;
}

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MIME_EXTENSION: Readonly<Record<string, string>> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
};

/**
 * File domain (PRD §32): upload, download, deletion.
 * Access always follows workspace permissions (PRD §113: backend is the boundary).
 */
@Injectable()
export class FileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async upload(
    actorId: string,
    workspaceId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ): Promise<UploadedFileInfo> {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'file.upload');

    if (file.size > MAX_FILE_BYTES) {
      throw forbidden('File exceeds the 25 MB limit');
    }
    if (file.size === 0) {
      throw forbidden('Empty files are not allowed');
    }

    const extension = MIME_EXTENSION[file.mimetype] ?? '';
    const storedName = `${randomUUID()}${extension}`;
    const uploadRoot = resolveUploadRoot();
    await mkdir(uploadRoot, { recursive: true });
    await writeFile(join(uploadRoot, storedName), file.buffer);

    const record = await this.prisma.file.create({
      data: {
        workspaceId,
        uploaderId: actorId,
        fileName: sanitizeFileName(file.originalname),
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: storedName,
      },
    });

    return {
      id: record.id,
      fileName: record.fileName,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
    };
  }

  /** Workspace file listing (active files, newest first) for the Files UI. */
  async listFiles(actorId: string, workspaceId: string): Promise<FileListItem[]> {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'file.download');

    const records = await this.prisma.file.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { uploader: { select: { displayName: true } } },
    });

    return records.map((record) => ({
      id: record.id,
      fileName: record.fileName,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      uploaderId: record.uploaderId,
      uploaderName: record.uploader?.displayName ?? null,
      createdAt: record.createdAt.toISOString(),
    }));
  }

  async download(actorId: string, workspaceId: string, fileId: string): Promise<FileDownload> {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'file.download');

    const record = await this.prisma.file.findFirst({
      where: { id: fileId, workspaceId, deletedAt: null },
    });
    if (!record) {
      throw notFound('File');
    }

    return {
      stream: createReadStream(join(resolveUploadRoot(), record.storagePath)),
      fileName: record.fileName,
      mimeType: record.mimeType,
    };
  }

  async softDelete(actorId: string, workspaceId: string, fileId: string): Promise<{ success: true }> {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'file.delete');

    const record = await this.prisma.file.findFirst({
      where: { id: fileId, workspaceId, deletedAt: null },
    });
    if (!record) {
      throw notFound('File');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.file.update({ where: { id: record.id }, data: { deletedAt: new Date() } });
    });

    // Best-effort disk cleanup; a failure here must not fail the request.
    await unlink(join(resolveUploadRoot(), record.storagePath)).catch(() => undefined);
    return { success: true };
  }
}

function resolveUploadRoot(): string {
  return join(process.cwd(), env.uploadDir);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}
