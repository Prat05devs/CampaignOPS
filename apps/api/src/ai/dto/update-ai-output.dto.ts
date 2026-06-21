import { IsObject, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateAiOutputDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsObject()
  responseJson?: Record<string, unknown>;
}
