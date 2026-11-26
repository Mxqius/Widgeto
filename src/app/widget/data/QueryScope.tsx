import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "./queryClient";

const client = makeQueryClient();

/**
 * Loaded on demand, so the six widgets that never fetch anything do not pay
 * for a query client or the library behind it.
 */
export default function QueryScope({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
