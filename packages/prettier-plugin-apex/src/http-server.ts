import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import util from "node:util";
import waitOn from "wait-on";

import { getSerializerBinDirectory } from "./util.js";

const waitOnPromise = util.promisify(waitOn);

export async function start(
  host: string,
  port: number,
  password: string,
  allowedOrigins?: string,
): Promise<ChildProcess> {
  let serializerBin = await getSerializerBinDirectory();
  if (process.platform === "win32") {
    serializerBin = path.join(serializerBin, "apex-ast-serializer-http.bat");
  } else {
    serializerBin = path.join(serializerBin, "apex-ast-serializer-http");
  }
  const args = ["-s", "-a", password, "-h", host, "-p", port.toString()];
  if (allowedOrigins !== undefined) {
    args.push("-c", allowedOrigins);
  }
  const command = spawn(serializerBin, args, {
    shell: true,
    stdio: "inherit",
  });

  await waitOnPromise({
    resources: [`http://${host}:${port}/api/ast`],
  });
  console.log(`Server listening on http://${host}:${port}`);

  return command;
}

export async function stop(
  host: string,
  port: number,
  password: string,
): Promise<Response> {
  return fetch(`http://${host}:${port}/shutdown?token=${password}`, {
    method: "POST",
  });
}
