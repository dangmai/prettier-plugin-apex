import { stop } from "../src/http-server";

export default async function stopTestServer() {
  await stop("localhost", 2117);
}
