import { spawn, ChildProcess } from "child_process";
import path from "path";
import util from "util";
import axios, { AxiosResponse } from "axios";
import waitOn from "wait-on";
import { getSerializerBinDirectory } from "./util";

const waitOnPromise = util.promisify(waitOn);

export async function start(
  host: string,
  port: number,
  allowedOrigins?: string,
): Promise<ChildProcess> {
  let serializerBin = getSerializerBinDirectory();
  if (process.platform === "win32") {
    serializerBin = path.join(serializerBin, "apex-ast-serializer-http.bat");
  } else {
    serializerBin = path.join(serializerBin, "apex-ast-serializer-http");
  }
  const args = ["-s", "-a", "secret", "-h", host, "-p", port.toString()];
  if (allowedOrigins !== undefined) {
    args.push("-c", allowedOrigins);
  }
  const command = spawn(serializerBin, args);

  await waitOnPromise({
    resources: [`http://${host}:${port}/api/ast`],
  });
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://${host}:${port}`);

  return command;
}

export async function stop(host: string, port: number): Promise<AxiosResponse> {
  return axios.post(`http://${host}:${port}/shutdown`, null, {
    params: {
      token: "secret",
    },
  });
}
