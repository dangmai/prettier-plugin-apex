import Editor from "@monaco-editor/react";
import endent from "endent";
import * as prettier from "prettier";
import { useEffect, useState } from "react";
import * as prettierApex from "../src/index.js";
import OptionEntry from "./OptionEntry.js";

function App() {
  const [parser, setParser] = useState("apex");
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState(2117);
  const [printWidth, setPrintWidth] = useState(80);
  const [tabWidth, setTabWidth] = useState(2);
  const [useTabs, setUseTabs] = useState(false);
  const [originalCode, setOriginalCode] = useState(endent`
    class HelloWorld {
      void hello() {
        Account[] accounts = [select id from account];
        System.debug(accounts);
      }
    }
  `);
  const [formattedCode, setFormattedCode] = useState("");

  const format = async (
    code: string,
    parserChoice: string,
    withPrintWidth: number,
    withTabWidth: number,
    shouldUseTabs: boolean,
  ) => {
    const parseOptions = {
      apexStandaloneParser: "built-in",
      apexStandalonePort: port,
      apexStandaloneHost: host,
      plugins: [prettierApex],
      parser: parserChoice,
      printWidth: withPrintWidth,
      tabWidth: withTabWidth,
      useTabs: shouldUseTabs,
    };
    try {
      const result = await prettier.format(code, parseOptions);
      setFormattedCode(result);
    } catch (err: any) {
      if ("message" in err) {
        setFormattedCode(err.message);
      } else {
        setFormattedCode(err);
      }
    }
  };
  useEffect(() => {
    format(originalCode, parser, printWidth, tabWidth, useTabs);
  }, []);
  return (
    <div className="grid">
      <div>
        <OptionEntry label="--host" labelHtmlFor="host">
          <input
            type="text"
            id="host"
            value={host}
            onChange={(event) => setHost(event.target.value)}
          />
        </OptionEntry>
        <OptionEntry label="--port" labelHtmlFor="port">
          <input
            type="number"
            id="port"
            value={port}
            onChange={(event) =>
              setPort(Number.parseInt(event.target.value, 10))
            }
          />
        </OptionEntry>
        <OptionEntry label="--parser" labelHtmlFor="parser">
          <select
            id="parser"
            value={parser}
            onChange={(event) => {
              setParser(event.target.value);
              format(
                originalCode,
                event.target.value,
                printWidth,
                tabWidth,
                useTabs,
              );
            }}
          >
            <option value="apex">apex</option>
            <option value="apex-anonymous">apex-anonymous</option>
          </select>
        </OptionEntry>
        <OptionEntry label="--print-width" labelHtmlFor="print-width">
          <input
            type="number"
            id="print-width"
            value={printWidth}
            onChange={(event) => {
              const width = Number.parseInt(event.target.value, 10);
              setPrintWidth(width);
              format(originalCode, parser, width, tabWidth, useTabs);
            }}
          />
        </OptionEntry>
        <OptionEntry label="--tab-width" labelHtmlFor="tab-width">
          <input
            type="number"
            id="tab-width"
            value={tabWidth}
            onChange={(event) => {
              const width = Number.parseInt(event.target.value, 10);
              setTabWidth(width);
              format(originalCode, parser, printWidth, width, useTabs);
            }}
          />
        </OptionEntry>
        <OptionEntry label="--use-tabs" labelHtmlFor="use-tabs">
          <input
            type="checkbox"
            id="use-tabs"
            checked={useTabs}
            onChange={(event) => {
              setUseTabs(event.target.checked);
              format(
                originalCode,
                parser,
                printWidth,
                tabWidth,
                event.target.checked,
              );
            }}
          />
        </OptionEntry>
      </div>
      <Editor
        height="100%"
        defaultLanguage="apex"
        value={originalCode}
        options={{ minimap: { enabled: false }, rulers: [printWidth] }}
        onChange={async (value) => {
          if (value === undefined) {
            return;
          }
          setOriginalCode(value);
          format(value, parser, printWidth, tabWidth, useTabs);
        }}
      />
      <Editor
        height="100%"
        defaultLanguage="apex"
        value={formattedCode}
        options={{
          domReadyOnly: true,
          readOnly: true,
          minimap: { enabled: false },
          rulers: [printWidth],
        }}
      />
    </div>
  );
}

export default App;
