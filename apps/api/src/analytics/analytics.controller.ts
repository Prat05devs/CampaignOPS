import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { AnalyticsService } from "./analytics.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("analytics/dashboard")
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.dashboard(user);
  }

  @Get("events/:eventId/analytics")
  eventAnalytics(@Param("eventId") eventId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.eventAnalytics(eventId, user);
  }
}
