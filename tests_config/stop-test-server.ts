import { stop } from "../src/http-server";
module.exports = async function () {
  await stop("localhost", 2117);
};
