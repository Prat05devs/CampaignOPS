import { PaymentStatus, VendorCategory } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class UpdateEventVendorDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(VendorCategory)
  category?: VendorCategory;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  serviceType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rateCard?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pastEventsServed?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsString()
  quotationFileId?: string;

  @IsOptional()
  @IsString()
  performanceNotes?: string;
}
