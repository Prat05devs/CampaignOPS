import { IsArray, IsOptional, IsString } from "class-validator";

export class SaveEventDebriefDto {
  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  whatWorked?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  whatToImprove?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reusableChecklist?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vendorNotes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  riskNotes?: string[];
}
