import { FileCategory } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UploadFileDto {
  @IsEnum(FileCategory)
  category!: FileCategory;
}
