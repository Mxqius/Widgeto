import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Island from "./Island";
import "./island.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Island />
  </StrictMode>,
);
