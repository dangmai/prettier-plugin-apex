import { start } from "../src/http-server";

export default async function startTestServer() {
  await start("localhost", 2117);
}
