import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CosmosClient, type Container } from "@azure/cosmos";
import { COSMOS_CONTAINER } from "./cosmos.constants";

@Global()
@Module({
  providers: [
    {
      provide: COSMOS_CONTAINER,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<Container> => {
        const endpoint = config.get<string>("COSMOS_ENDPOINT")?.trim();
        const key = config.get<string>("COSMOS_KEY")?.trim();
        if (!endpoint || !key) {
          throw new Error("Missing COSMOS_ENDPOINT or COSMOS_KEY");
        }

        const databaseId =
          config.get<string>("COSMOS_DATABASE")?.trim() || "gantt";
        const containerId =
          config.get<string>("COSMOS_CONTAINER")?.trim() || "timelines";

        const client = new CosmosClient({ endpoint, key });
        const { database } = await client.databases.createIfNotExists({
          id: databaseId,
        });
        const { container } = await database.containers.createIfNotExists({
          id: containerId,
          partitionKey: { paths: ["/userId"] },
        });
        return container;
      },
    },
  ],
  exports: [COSMOS_CONTAINER],
})
export class CosmosModule {}
