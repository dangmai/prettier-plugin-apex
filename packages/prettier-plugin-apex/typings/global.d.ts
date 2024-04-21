import "prettier";

declare module "prettier" {
  interface RequiredOptions {
    apexStandaloneParser: string;
    apexStandalonePort: number;
    apexStandaloneHost: string;
    apexStandaloneProtocol: string;
    apexInsertFinalNewline: boolean;
  }
  namespace __debug {
    // eslint-disable-next-line import/prefer-default-export
    export function parse(
      originalText: string,
      originalOptions: Partial<RequiredOptions>,
      { massage: boolean },
    ): AST;
  }
}
