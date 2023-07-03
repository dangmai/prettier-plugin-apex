import { stop } from "../src/http-server.js";

export default async function stopTestServer() {
  await stop("localhost", 2117);
}
