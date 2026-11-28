import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { bootLang } from "@/shared/i18n/locale";
import CaptureWindow from "./CaptureWindow";
import "./capture.css";

// come up in the language this window last ran in, so there is no English flash
void bootLang().then(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <CaptureWindow />
    </StrictMode>,
  ),
);
