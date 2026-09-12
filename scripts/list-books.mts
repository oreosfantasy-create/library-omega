import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { createTRPCClient } from "@trpc/client";
import type { AppRouter } from "../server/routers";
const client = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "http://localhost:3000/api/trpc", transformer: superjson })],
});
const books = await client.books.list.query();
for (const b of books) {
  console.log(b.fileType, b.coverKey ? "COVER" : "sin-cover", b.title);
}
