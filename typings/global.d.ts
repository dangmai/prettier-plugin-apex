import "prettier";
// eslint-disable-next-line import/no-extraneous-dependencies -- temporary workaround, only needed in dev
import {
  type FormData as FormDataType,
  type Headers as HeadersType,
  type Request as RequestType,
  type Response as ResponseType,
} from "undici";

declare module "prettier" {
  interface RequiredOptions {
    apexStandaloneParser: string;
    apexStandalonePort: number;
    apexStandaloneHost: string;
    apexStandaloneProtocol: string;
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

// Needed because of this issue: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/60924
declare global {
  // Re-export undici fetch function and various classes to global scope.
  // These are classes and functions expected to be at global scope according to Node.js v18 API
  // documentation.
  // See: https://nodejs.org/dist/latest-v18.x/docs/api/globals.html
  export const {
    FormData,
    Headers,
    Request,
    Response,
    fetch,
  }: typeof import("undici");

  type FormData = FormDataType;
  type Headers = HeadersType;
  type Request = RequestType;
  type Response = ResponseType;
}
