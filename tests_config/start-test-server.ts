import { start } from "../src/http-server";
module.exports = async function () {
  await start("localhost", 2117);
};
