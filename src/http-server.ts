import { spawn, ChildProcess } from "child_process";
import path from "path";
import util from "util";
import axios, { AxiosResponse } from "axios";
import waitOn from "wait-on";
import { getSerializerBinDirectory } from "./util";

const waitOnPromise = util.promisify(waitOn);

export async function start(
  address: string,
  port: number,
): Promise<ChildProcess> {
  let serializerBin = getSerializerBinDirectory();
  if (process.platform === "win32") {
    serializerBin = path.join(serializerBin, "apex-ast-serializer-http.bat");
  } else {
    serializerBin = path.join(serializerBin, "apex-ast-serializer-http");
  }
  const command = spawn(serializerBin, ["-s", "-a", "secret"]);

  await waitOnPromise({
    resources: [`http://${address}:${port}/api/ast`],
  });

  return command;
}

export async function stop(
  address: string,
  port: number,
): Promise<AxiosResponse> {
  return axios.post(`http://${address}:${port}/shutdown?token=secret`);
}
