import { EventCategory, EventScaleTier, EventStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength
} from "class-validator";

export class CreateEventDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsEnum(EventCategory)
  category!: EventCategory;

  @IsString()
  @MinLength(2)
  subtype!: string;

  @IsEnum(EventScaleTier)
  scaleTier!: EventScaleTier;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedPax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedBudgetAmount?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;

  @IsOptional()
  @IsString()
  departmentOrClient?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stakeholders?: string[];

  @IsOptional()
  @IsString()
  brandContext?: string;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}
