import type { ParserOptions } from "prettier";

/**
 * Prettier's parser options plus the plugin's own options (declared in
 * `index.ts`'s `options` export). Prettier hands handlers a plain
 * `ParserOptions`, so the custom fields are otherwise untyped — this is the type
 * the printer reads them through.
 */
export interface ApexParserOptions extends ParserOptions {
  apexStandaloneParser: "none" | "built-in" | "native";
  apexStandaloneHost: string;
  apexStandalonePort: number;
  apexStandaloneProtocol: string;
  apexInsertFinalNewline: boolean;
}
