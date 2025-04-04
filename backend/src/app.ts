import "reflect-metadata";
import { Elysia, t } from "elysia";
import { Database } from "./database/database";
import { TraktApi } from "@services/trakt/trakt.api";
import { TMDBApi } from "@services/tmdb/tmdb.api";
import { Scheduler } from "@services/scheduler";
import { MediaService } from "@services/media/media.service";
import { ListService } from "@services/media/list.service";
import { ListSynchronizer } from "@services/media/list.syncronizer";
import { validateConfiguration } from "./configuration";

const app = new Elysia();
const db = new Database();

type Methods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? T[K] : never;
};

const bind =
  <T extends object, K extends keyof Methods<T>>(
    instance: T,
    method: K,
    ...args: Parameters<Methods<T>[K]>
  ) =>
  () => {
    return (instance[method] as Methods<T>[K])(...args);
  };

async function startApp() {
  const traktApi = new TraktApi();
  const tmdbApi = new TMDBApi();

  await db.initialize();
  const mediaService = new MediaService(db);
  const scheduler = new Scheduler();
  const listService = new ListService(db, tmdbApi, mediaService);
  const listSynchronizer = new ListSynchronizer(listService);

  scheduler.scheduleTask(
    "refreshLists",
    60 * 60,
    bind(listSynchronizer, "synchronize"),
  );

  app.get("/", () => ({
    message: "Welcome to the Elysia and TypeScript project!",
  }));

  app.get("/lists", async () => {
    const lists = await listService.getLists();
    return lists.map((list) => ({
      name: list.name,
      slug: list.slug,
      description: list.description,
      url: `/list/${list.slug}`,
    }));
  });

  app.get(
    "/list/:slug",
    async ({ params, query }) => {
      const list = await listService.getListContent(params.slug, query.lang);
      return {
        results: list,
        total: list.length,
      };
    },
    {
      params: t.Object({
        slug: t.String(),
      }),
      query: t.Object({
        lang: t.Optional(t.String()),
      }),
    },
  );

  app.listen(3000, () => {
    console.log(`Server is running on http://localhost:3000`);
  });
}

// Start the application: first check environment variables, then start the app
async function main() {
  await validateConfiguration();
  await startApp();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
