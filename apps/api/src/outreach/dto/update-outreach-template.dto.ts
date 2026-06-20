import { OutreachRecipientType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateOutreachTemplateDto {
  @IsOptional()
  @IsEnum(OutreachRecipientType)
  recipientType?: OutreachRecipientType;

  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  channel?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  body?: string;
}
