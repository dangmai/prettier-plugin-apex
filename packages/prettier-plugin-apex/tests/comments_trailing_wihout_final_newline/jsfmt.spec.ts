import { fileURLToPath } from "url";

runSpec(fileURLToPath(new URL(".", import.meta.url)), ["apex"], {
  tabWidth: 2,
  apexInsertFinalNewline: false,
});
