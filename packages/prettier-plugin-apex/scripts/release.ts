// This script is meant to be used as part of the `release` script on the root
// repository. It updates the version for the native executables in the `util.ts` file,
// and print out the new version to stdout.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// eslint-disable-next-line import/no-relative-packages
import rootPackageJson from "../../../package.json";

async function release() {
  const { version } = rootPackageJson;

  // eslint-disable-next-line no-console
  console.log(version);

  const utilFilePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../src/util.ts",
  );
  const utilFileContent = await fs.promises.readFile(utilFilePath, "utf-8");

  // Update the embedded version in the file content
  const updatedContent = utilFileContent.replace(
    /const version = "\S+";/,
    `const version = "${version}";`,
  );

  // Write the updated content back to the file
  await fs.promises.writeFile(utilFilePath, updatedContent, "utf-8");
}

release();
