import { ContactCategory, ContactStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDate, IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreateEventContactDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsEnum(ContactCategory)
  category!: ContactCategory;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  followUpAt?: Date;

  @IsOptional()
  @IsString()
  eventNotes?: string;
}
