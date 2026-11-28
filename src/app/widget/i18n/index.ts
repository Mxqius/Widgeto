import { createT } from "@/shared/i18n/t";
import type fa from "./fa";

export const { t, useT } = createT<keyof typeof fa>(() => import("./fa"));
export { digits } from "@/shared/i18n/format";
