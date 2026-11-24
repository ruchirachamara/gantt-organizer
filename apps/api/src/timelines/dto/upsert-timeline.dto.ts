import { Type } from "class-transformer";
import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";

class TaskDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  start!: string;

  @IsString()
  end!: string;
}

class ProjectDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  color!: string;

  @IsString()
  deadline!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks!: TaskDto[];
}

class TimelineDataDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  projects!: ProjectDto[];
}

export class UpsertTimelineDto {
  @ValidateNested()
  @Type(() => TimelineDataDto)
  data!: TimelineDataDto;
}
