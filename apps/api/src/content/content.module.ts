import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ActivityModule } from "../activity/activity.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ContentController } from "./content.controller";
import { ContentService } from "./content.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule, ActivityModule],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService]
})
export class ContentModule {}
