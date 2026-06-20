import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ActivityService } from "./activity.service";

@Controller("events/:eventId/activity-logs")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  list(@Param("eventId") eventId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.activityService.list(eventId, user);
  }
}
