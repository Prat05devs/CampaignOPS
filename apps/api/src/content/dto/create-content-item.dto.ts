import { ContentApprovalStatus, ContentPlatform } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreateContentItemDto {
  @IsEnum(ContentPlatform)
  platform!: ContentPlatform;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsEnum(ContentApprovalStatus)
  approvalStatus?: ContentApprovalStatus;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  assetFileId?: string;
}
