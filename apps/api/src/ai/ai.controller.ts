import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { OrganizationRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { AiService } from "./ai.service";
import { UpdateAiOutputDto } from "./dto/update-ai-output.dto";

@Controller("events/:eventId")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get("ai-outputs")
  listOutputs(@Param("eventId") eventId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.aiService.listOutputs(eventId, user);
  }

  @Post("ai/event-plan")
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  generateEventPlan(@Param("eventId") eventId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.aiService.generateEventPlan(eventId, user);
  }

  @Patch("ai-outputs/:outputId")
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  updateOutput(
    @Param("eventId") eventId: string,
    @Param("outputId") outputId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateAiOutputDto: UpdateAiOutputDto
  ) {
    return this.aiService.updateOutput(eventId, outputId, user, updateAiOutputDto);
  }

  @Patch("ai-outputs/:outputId/accept")
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  acceptOutput(
    @Param("eventId") eventId: string,
    @Param("outputId") outputId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.aiService.acceptOutput(eventId, outputId, user);
  }

  @Post("ai-outputs/:outputId/convert/tasks")
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  convertOutputToTasks(
    @Param("eventId") eventId: string,
    @Param("outputId") outputId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.aiService.convertOutputToTasks(eventId, outputId, user);
  }
}
