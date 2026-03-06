import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";
import { headers } from "next/headers";

export const createTRPCContext = cache(async (opts?: { req?: Request }) => {
  const heads = new Headers(opts?.req?.headers ?? (await headers()));


});

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});



export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;