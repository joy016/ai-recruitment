"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { InboxApiError } from "@/lib/api/inbox";

/** Auth and permission errors won't fix themselves on retry, whichever client threw them. */
const isUnretryableStatus = (error: unknown) => {
  const status =
    error instanceof InboxApiError
      ? error.status
      : isAxiosError(error)
        ? (error.response?.status ?? null)
        : null;

  return status === 401 || status === 403 || status === 404;
};

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) =>
          !isUnretryableStatus(error) && failureCount < 2,
      },
    },
  });

/** One client per browser tab, like StoreProvider's store. */
export default function QueryProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [client] = useState(makeQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
