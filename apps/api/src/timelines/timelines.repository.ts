import { Inject, Injectable } from "@nestjs/common";
import type { Container } from "@azure/cosmos";
import { COSMOS_CONTAINER } from "../cosmos/cosmos.constants";
import type { TimelineData, TimelineDocument } from "./timeline.types";

@Injectable()
export class TimelinesRepository {
  constructor(
    @Inject(COSMOS_CONTAINER) private readonly container: Container
  ) {}

  async getByUserId(userId: string): Promise<TimelineDocument | null> {
    try {
      const { resource } = await this.container
        .item(userId, userId)
        .read<TimelineDocument>();
      return resource ?? null;
    } catch (err) {
      if ((err as { code?: number }).code === 404) return null;
      throw err;
    }
  }

  async upsert(
    userId: string,
    data: TimelineData
  ): Promise<TimelineDocument> {
    const doc: TimelineDocument = {
      id: userId,
      userId,
      data,
      updatedAt: new Date().toISOString(),
    };
    const { resource } = await this.container.items.upsert<TimelineDocument>(doc);
    if (!resource) {
      throw new Error("Cosmos upsert returned no resource");
    }
    return resource;
  }

  async deleteByUserId(userId: string): Promise<boolean> {
    try {
      await this.container.item(userId, userId).delete();
      return true;
    } catch (err) {
      if ((err as { code?: number }).code === 404) return false;
      throw err;
    }
  }
}
