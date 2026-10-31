import { registerPlugin } from "@/lib/plugins";
import { CardCounterPlugin } from "./built-in/card-counter";

export function initBuiltInPlugins() {
  try {
    registerPlugin(CardCounterPlugin());
  } catch (error) {
    console.error("Failed to register built-in plugins:", error);
  }
}
