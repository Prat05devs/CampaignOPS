import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ActivityService } from "../activity/activity.service";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOutreachTemplateDto } from "./dto/create-outreach-template.dto";
import { UpdateOutreachTemplateDto } from "./dto/update-outreach-template.dto";

@Injectable()
export class OutreachService {
  constructor(
    private readonly activityService: ActivityService,
    private readonly prisma: PrismaService
  ) {}

  async list(eventId: string, user: AuthenticatedUser) {
    await this.assertEventAccess(eventId, user.organizationId);

    return this.prisma.outreachTemplate.findMany({
      where: {
        eventId,
        organizationId: user.organizationId
      },
      include: this.outreachTemplateInclude,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    });
  }

  async create(eventId: string, user: AuthenticatedUser, createOutreachTemplateDto: CreateOutreachTemplateDto) {
    await this.assertEventAccess(eventId, user.organizationId);

    const template = await this.prisma.outreachTemplate.create({
      data: {
        ...createOutreachTemplateDto,
        createdById: user.sub,
        eventId,
        organizationId: user.organizationId
      },
      include: this.outreachTemplateInclude
    });

    await this.activityService.record({
      action: "OUTREACH_DRAFT_CREATED",
      entityId: template.id,
      entityType: "OutreachTemplate",
      eventId,
      metadata: {
        channel: template.channel,
        recipientType: template.recipientType,
        title: template.title
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return template;
  }

  async update(
    eventId: string,
    templateId: string,
    user: AuthenticatedUser,
    updateOutreachTemplateDto: UpdateOutreachTemplateDto
  ) {
    await this.assertEventAccess(eventId, user.organizationId);
    await this.assertTemplateAccess(eventId, templateId, user.organizationId);

    const template = await this.prisma.outreachTemplate.update({
      where: { id: templateId },
      data: updateOutreachTemplateDto,
      include: this.outreachTemplateInclude
    });

    await this.activityService.record({
      action: "OUTREACH_DRAFT_UPDATED",
      entityId: template.id,
      entityType: "OutreachTemplate",
      eventId,
      metadata: {
        channel: template.channel,
        recipientType: template.recipientType,
        title: template.title
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return template;
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

  private async assertTemplateAccess(eventId: string, templateId: string, organizationId: string) {
    const template = await this.prisma.outreachTemplate.findFirst({
      where: {
        eventId,
        id: templateId,
        organizationId
      },
      select: { id: true }
    });

    if (!template) {
      throw new NotFoundException("Outreach draft not found.");
    }
  }

  private readonly outreachTemplateInclude = {
    createdBy: {
      select: {
        email: true,
        id: true,
        name: true
      }
    }
  } satisfies Prisma.OutreachTemplateInclude;
}
