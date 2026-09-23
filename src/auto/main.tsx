import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AutoQuotePage from "./AutoQuotePage";
import "../styles.css";

createRoot(document.getElementById("root")!).render(<StrictMode><AutoQuotePage /></StrictMode>);
