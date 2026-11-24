import { Injectable, NotFoundException } from "@nestjs/common";
import type { UpsertTimelineDto } from "./dto/upsert-timeline.dto";
import type { TimelineData, TimelineDocument } from "./timeline.types";
import { TimelinesRepository } from "./timelines.repository";

@Injectable()
export class TimelinesService {
  constructor(private readonly repo: TimelinesRepository) {}

  async getMine(userId: string): Promise<TimelineDocument> {
    const doc = await this.repo.getByUserId(userId);
    if (!doc) throw new NotFoundException("Timeline not found");
    return doc;
  }

  async upsertMine(
    userId: string,
    dto: UpsertTimelineDto
  ): Promise<TimelineDocument> {
    return this.repo.upsert(userId, dto.data as TimelineData);
  }

  async deleteMine(userId: string): Promise<void> {
    const deleted = await this.repo.deleteByUserId(userId);
    if (!deleted) throw new NotFoundException("Timeline not found");
  }
}
