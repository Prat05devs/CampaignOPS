import { OutreachRecipientType } from "@prisma/client";
import { IsEnum, IsString, MinLength } from "class-validator";

export class CreateOutreachTemplateDto {
  @IsEnum(OutreachRecipientType)
  recipientType!: OutreachRecipientType;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(2)
  channel!: string;

  @IsString()
  @MinLength(10)
  body!: string;
}
