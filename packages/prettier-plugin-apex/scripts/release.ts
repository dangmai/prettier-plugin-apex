// This script is meant to be used as part of the `release` script on the root
// repository. It updates the version for the native executables in the `util.ts` file,
// and print out the new version to stdout.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

async function release() {
  // We use readFileSync instead of import here, because with import we have to turn
  // on resolveJsonModule in tsconfig, which messes up the dev build.
  const { version } = JSON.parse(
    fs.readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../../package.json",
      ),
      "utf8",
    ),
  );

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
