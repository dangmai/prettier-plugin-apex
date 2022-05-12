import prettier from "prettier";

declare module "prettier" {
  interface RequiredOptions {
    apexStandaloneParser: string;
    apexStandalonePort: number;
    apexStandaloneHost: string;
    apexInsertFinalNewline: boolean;
  }
  namespace __debug {
    export function parse(
      originalText: string,
      originalOptions: Partial<RequiredOptions>,
      massage: boolean,
    ): AST;
  }
}
