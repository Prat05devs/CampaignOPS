import { IsString, MinLength } from "class-validator";

export class SwitchOrganizationDto {
  @IsString()
  @MinLength(1)
  organizationId!: string;
}
