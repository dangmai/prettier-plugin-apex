import * as url from "url";

runSpec(
  url.fileURLToPath(new URL(".", import.meta.url)),
  ["apex"],
  [
    { useTabs: false, tabWidth: 2 },
    { useTabs: false, tabWidth: 4 },
    { useTabs: true, tabWidth: 2 },
  ],
);
