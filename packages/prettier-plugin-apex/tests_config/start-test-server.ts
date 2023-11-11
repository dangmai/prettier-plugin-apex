import { start } from "../src/http-server.js";

export default async function startTestServer() {
  await start("localhost", 2117, "secret");
}
