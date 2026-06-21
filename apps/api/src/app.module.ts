import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ActivityModule } from "./activity/activity.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AiModule } from "./ai/ai.module";
import { AuthModule } from "./auth/auth.module";
import { BudgetModule } from "./budget/budget.module";
import { ContactsModule } from "./contacts/contacts.module";
import { ContentModule } from "./content/content.module";
import { EventsModule } from "./events/events.module";
import { FilesModule } from "./files/files.module";
import { HealthModule } from "./health/health.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { OutreachModule } from "./outreach/outreach.module";
import { PrismaModule } from "./prisma/prisma.module";
import { TasksModule } from "./tasks/tasks.module";
import { UsersModule } from "./users/users.module";
import { VendorsModule } from "./vendors/vendors.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    ActivityModule,
    AnalyticsModule,
    AiModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    EventsModule,
    TasksModule,
    BudgetModule,
    ContactsModule,
    ContentModule,
    VendorsModule,
    OutreachModule,
    FilesModule
  ]
})
export class AppModule {}
