"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InboxApiError } from "@/lib/api/inbox";

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Auth and permission errors won't fix themselves on retry.
        retry: (failureCount, error) =>
          !(error instanceof InboxApiError && (error.status === 401 || error.status === 403 || error.status === 404)) &&
          failureCount < 2,
      },
    },
  });

/** One client per browser tab, like StoreProvider's store. */
export default function QueryProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [client] = useState(makeQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
