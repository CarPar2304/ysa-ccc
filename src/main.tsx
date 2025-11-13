import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Asegurar light mode por defecto
if (!localStorage.getItem("theme")) {
  document.documentElement.classList.remove("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
