import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { OrganizationRole } from "@prisma/client";
import { Response } from "express";
import { createReadStream } from "fs";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { UploadFileDto } from "./dto/upload-file.dto";
import { FilesService, type UploadedFilePayload } from "./files.service";

@Controller("events/:eventId/files")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  list(@Param("eventId") eventId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.filesService.list(eventId, user);
  }

  @Post()
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 20 * 1024 * 1024
      }
    })
  )
  upload(
    @Param("eventId") eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() uploadFileDto: UploadFileDto,
    @UploadedFile() file: UploadedFilePayload
  ) {
    return this.filesService.upload(eventId, user, uploadFileDto, file);
  }

  @Get(":fileId/download")
  async download(
    @Param("eventId") eventId: string,
    @Param("fileId") fileId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response
  ) {
    const file = await this.filesService.getDownload(eventId, fileId, user);

    response.set({
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.fileName)}"`,
      "Content-Type": file.mimeType ?? "application/octet-stream"
    });

    return new StreamableFile(createReadStream(file.absolutePath));
  }

  @Delete(":fileId")
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  remove(
    @Param("eventId") eventId: string,
    @Param("fileId") fileId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.filesService.remove(eventId, fileId, user);
  }
}
