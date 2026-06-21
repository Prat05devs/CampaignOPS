import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ActivityService } from "../activity/activity.service";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateContentItemDto } from "./dto/create-content-item.dto";
import { UpdateContentItemDto } from "./dto/update-content-item.dto";

@Injectable()
export class ContentService {
  constructor(
    private readonly activityService: ActivityService,
    private readonly prisma: PrismaService
  ) {}

  async list(eventId: string, user: AuthenticatedUser) {
    await this.assertEventAccess(eventId, user.organizationId);

    return this.prisma.contentItem.findMany({
      where: {
        eventId
      },
      include: this.contentItemInclude,
      orderBy: [{ scheduledFor: "asc" }, { updatedAt: "desc" }]
    });
  }

  async create(eventId: string, user: AuthenticatedUser, createContentItemDto: CreateContentItemDto) {
    await this.assertEventAccess(eventId, user.organizationId);
    await this.assertOwnerAccess(createContentItemDto.ownerId, user.organizationId);
    await this.assertAssetAccess(createContentItemDto.assetFileId, eventId, user.organizationId);

    const item = await this.prisma.contentItem.create({
      data: {
        ...createContentItemDto,
        eventId,
        ownerId: createContentItemDto.ownerId,
        scheduledFor: createContentItemDto.scheduledFor ? new Date(createContentItemDto.scheduledFor) : undefined
      },
      include: this.contentItemInclude
    });

    await this.activityService.record({
      action: "CONTENT_ITEM_CREATED",
      entityId: item.id,
      entityType: "ContentItem",
      eventId,
      metadata: {
        approvalStatus: item.approvalStatus,
        platform: item.platform,
        title: item.title
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return item;
  }

  async update(
    eventId: string,
    contentItemId: string,
    user: AuthenticatedUser,
    updateContentItemDto: UpdateContentItemDto
  ) {
    await this.assertEventAccess(eventId, user.organizationId);
    await this.assertContentItemAccess(eventId, contentItemId);
    await this.assertOwnerAccess(updateContentItemDto.ownerId, user.organizationId);
    await this.assertAssetAccess(updateContentItemDto.assetFileId, eventId, user.organizationId);

    const item = await this.prisma.contentItem.update({
      where: { id: contentItemId },
      data: {
        ...updateContentItemDto,
        scheduledFor: updateContentItemDto.scheduledFor ? new Date(updateContentItemDto.scheduledFor) : undefined
      },
      include: this.contentItemInclude
    });

    await this.activityService.record({
      action: "CONTENT_ITEM_UPDATED",
      entityId: item.id,
      entityType: "ContentItem",
      eventId,
      metadata: {
        approvalStatus: item.approvalStatus,
        platform: item.platform,
        title: item.title
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return item;
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

  private async assertContentItemAccess(eventId: string, contentItemId: string) {
    const item = await this.prisma.contentItem.findFirst({
      where: {
        eventId,
        id: contentItemId
      },
      select: { id: true }
    });

    if (!item) {
      throw new NotFoundException("Content item not found.");
    }
  }

  private async assertOwnerAccess(ownerId: string | undefined, organizationId: string) {
    if (!ownerId) {
      return;
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: ownerId
      },
      select: { id: true }
    });

    if (!membership) {
      throw new NotFoundException("Content owner not found.");
    }
  }

  private async assertAssetAccess(assetFileId: string | undefined, eventId: string, organizationId: string) {
    if (!assetFileId) {
      return;
    }

    const asset = await this.prisma.fileAsset.findFirst({
      where: {
        eventId,
        id: assetFileId,
        organizationId
      },
      select: { id: true }
    });

    if (!asset) {
      throw new NotFoundException("Content asset not found.");
    }
  }

  private readonly contentItemInclude = {
    assetFile: {
      select: {
        fileName: true,
        id: true,
        mimeType: true
      }
    },
    owner: {
      select: {
        email: true,
        id: true,
        name: true
      }
    }
  } satisfies Prisma.ContentItemInclude;
}
