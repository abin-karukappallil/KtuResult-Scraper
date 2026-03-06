import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import { resultRouter } from "./result";
export const appRouter = createTRPCRouter({
  test: publicProcedure.query(async () => {
    return {
      status: "success",
    };
  }),
  result: resultRouter,
});

export type AppRouter = typeof appRouter;