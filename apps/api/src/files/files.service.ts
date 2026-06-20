import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { ActivityService } from "../activity/activity.service";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { UploadFileDto } from "./dto/upload-file.dto";

export type UploadedFilePayload = {
  buffer?: Buffer;
  mimetype?: string;
  originalname: string;
  size: number;
};

@Injectable()
export class FilesService {
  private readonly uploadRoot = join(process.cwd(), "uploads");

  constructor(
    private readonly activityService: ActivityService,
    private readonly prisma: PrismaService
  ) {}

  async list(eventId: string, user: AuthenticatedUser) {
    await this.assertEventAccess(eventId, user.organizationId);

    return this.prisma.fileAsset.findMany({
      where: {
        eventId,
        organizationId: user.organizationId
      },
      include: this.fileAssetInclude,
      orderBy: [{ category: "asc" }, { createdAt: "desc" }]
    });
  }

  async upload(eventId: string, user: AuthenticatedUser, uploadFileDto: UploadFileDto, file?: UploadedFilePayload) {
    await this.assertEventAccess(eventId, user.organizationId);

    if (!file?.buffer?.length) {
      throw new BadRequestException("File is required.");
    }

    const originalName = sanitizeFileName(file.originalname);
    const storedFileName = `${randomUUID()}-${originalName}`;
    const relativePath = join(user.organizationId, eventId, storedFileName);
    const absolutePath = join(this.uploadRoot, relativePath);

    await mkdir(join(this.uploadRoot, user.organizationId, eventId), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    try {
      const fileAsset = await this.prisma.fileAsset.create({
        data: {
          category: uploadFileDto.category,
          eventId,
          fileName: originalName,
          fileUrl: relativePath,
          mimeType: file.mimetype,
          organizationId: user.organizationId,
          sizeBytes: file.size,
          uploadedById: user.sub
        },
        include: this.fileAssetInclude
      });

      await this.activityService.record({
        action: "FILE_UPLOADED",
        entityId: fileAsset.id,
        entityType: "FileAsset",
        eventId,
        metadata: {
          category: fileAsset.category,
          fileName: fileAsset.fileName,
          sizeBytes: fileAsset.sizeBytes
        },
        organizationId: user.organizationId,
        userId: user.sub
      });

      return fileAsset;
    } catch (error) {
      await unlink(absolutePath).catch(() => null);
      throw error;
    }
  }

  async getDownload(eventId: string, fileId: string, user: AuthenticatedUser) {
    const file = await this.assertFileAccess(eventId, fileId, user.organizationId);
    const absolutePath = join(this.uploadRoot, file.fileUrl);

    try {
      await stat(absolutePath);
    } catch {
      throw new NotFoundException("Stored file not found.");
    }

    return {
      absolutePath,
      fileName: file.fileName,
      mimeType: file.mimeType
    };
  }

  async remove(eventId: string, fileId: string, user: AuthenticatedUser) {
    const file = await this.assertFileAccess(eventId, fileId, user.organizationId);
    const absolutePath = join(this.uploadRoot, file.fileUrl);

    await this.prisma.fileAsset.delete({
      where: { id: file.id }
    });
    await unlink(absolutePath).catch(() => null);
    await this.activityService.record({
      action: "FILE_DELETED",
      entityId: file.id,
      entityType: "FileAsset",
      eventId,
      metadata: {
        fileName: file.fileName
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return { success: true };
  }

  private async assertEventAccess(eventId: string, organizationId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId
      },
      select: { id: true }
    });

    if (!event) {
      throw new NotFoundException("Event not found.");
    }
  }

  private async assertFileAccess(eventId: string, fileId: string, organizationId: string) {
    const file = await this.prisma.fileAsset.findFirst({
      where: {
        eventId,
        id: fileId,
        organizationId
      },
      select: {
        fileName: true,
        fileUrl: true,
        id: true,
        mimeType: true
      }
    });

    if (!file) {
      throw new NotFoundException("File not found.");
    }

    return file;
  }

  private readonly fileAssetInclude = {
    uploadedBy: {
      select: {
        email: true,
        id: true,
        name: true
      }
    }
  } satisfies Prisma.FileAssetInclude;
}

function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-");

  if (cleaned) {
    return cleaned.slice(0, 160);
  }

  return createHash("sha256").update(fileName).digest("hex").slice(0, 24);
}
