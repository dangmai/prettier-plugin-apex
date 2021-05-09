const fs = require("fs");
const path = require("path");
const prettier = require("prettier");

describe("Parser Tests", () => {
  it("runs synchronous parser on valid class correctly", () => {
    const fileName = path.join(__dirname, "ValidClass.cls");
    const source = fs.readFileSync(fileName, "utf8").replace(/\r\n/g, "\n");
    const output = prettier.format(source, {
      plugins: ["."],
      filepath: fileName,
      parser: "apex",
    });
    expect(output).toBeDefined();
  });
  it("runs synchronous parser on valid anonymous block correctly", () => {
    const fileName = path.join(__dirname, "ValidAnonymousBlock.apex");
    const source = fs.readFileSync(fileName, "utf8").replace(/\r\n/g, "\n");
    const output = prettier.format(source, {
      plugins: ["."],
      filepath: fileName,
      parser: "apex-anonymous",
    });
    expect(output).toBeDefined();
  });
  it("runs asynchronous parser correctly", () => {
    const fileName = path.join(__dirname, "ValidClass.cls");
    const source = fs.readFileSync(fileName, "utf8").replace(/\r\n/g, "\n");
    const output = prettier.format(source, {
      plugins: ["."],
      filepath: fileName,
      parser: "apex",
      apexStandaloneParser: "built-in",
      apexStandalonePort: 2117,
      apexStandaloneHost: "localhost",
    });
    expect(output).toBeDefined();
  });
  it("throws error when asynchronous parser server cannot be reached", () => {
    const fileName = path.join(__dirname, "ValidClass.cls");
    const source = fs.readFileSync(fileName, "utf8").replace(/\r\n/g, "\n");
    expect(() =>
      prettier.format(source, {
        plugins: ["."],
        filepath: fileName,
        parser: "apex",
        apexStandaloneParser: "built-in",
        apexStandalonePort: 2118,
        apexStandaloneHost: "localhost",
      }),
    ).toThrow("Failed to connect to Apex parsing server");
  });
  it("throws error when input file is invalid", () => {
    const fileName = path.join(__dirname, "InvalidClass.cls");
    const source = fs.readFileSync(fileName, "utf8").replace(/\r\n/g, "\n");
    expect(() =>
      prettier.format(source, {
        plugins: ["."],
        filepath: fileName,
        parser: "apex",
        apexStandaloneParser: "built-in",
        apexStandalonePort: 2117,
        apexStandaloneHost: "localhost",
      }),
    ).toThrow("Unexpected token");
  });
});
