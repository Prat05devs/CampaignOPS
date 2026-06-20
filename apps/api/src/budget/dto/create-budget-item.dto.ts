import { BudgetCategory, PaymentStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateBudgetItemDto {
  @IsEnum(BudgetCategory)
  category!: BudgetCategory;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualAmount?: number;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;
}
