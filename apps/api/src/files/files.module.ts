import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ActivityModule } from "../activity/activity.module";
import { PrismaModule } from "../prisma/prisma.module";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule, ActivityModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService]
})
export class FilesModule {}
