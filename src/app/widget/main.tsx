import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { bootLang } from "@/shared/i18n/locale";
import { WIDGET_KINDS } from "@/shared/widgets/kinds";
import type { WidgetKind } from "@/shared/types/widget";
import WidgetWindow from "./WidgetWindow";
import "./widget.css";

const raw = new URLSearchParams(window.location.search).get("w");
const kind = raw && (WIDGET_KINDS as string[]).includes(raw) ? (raw as WidgetKind) : null;

if (kind) {
  // come up in the language this window last ran in, so there is no English flash
  void bootLang().then(() =>
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <WidgetWindow kind={kind} />
      </StrictMode>,
    ),
  );
}
