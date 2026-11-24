# Azure Cosmos DB setup

Used by `@gantt/api` (`apps/api`). Credentials belong in `apps/api/.env`.

1. [Azure Portal](https://portal.azure.com) → create **Azure Cosmos DB for NoSQL**.
2. Enable the **Free tier** at creation (provisioned throughput, not serverless).
3. Create database `gantt` and container `timelines` with partition key `/userId`.
4. Copy URI and primary key into `apps/api/.env`:

```env
COSMOS_ENDPOINT=https://<account>.documents.azure.com:443/
COSMOS_KEY=<primary-key>
COSMOS_DATABASE=gantt
COSMOS_CONTAINER=timelines
```

Document shape per signed-in Google user (`sub` claim):

```json
{
  "id": "<google-sub>",
  "userId": "<google-sub>",
  "data": { "projects": [] },
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```
