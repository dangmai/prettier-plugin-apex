import Editor from "@monaco-editor/react";
import endent from "endent";
import * as prettier from "prettier";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import * as prettierApex from "../src/index.js";
import OptionEntry from "./OptionEntry.js";

const DEBOUNCE_TIME = 500;

function App() {
  const [parser, setParser] = useState("apex");
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState(2117);
  const [protocol, setProtocol] = useState("http");
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
  const [debouncedCode] = useDebounce(originalCode, DEBOUNCE_TIME);
  const [debouncedHost] = useDebounce(host, DEBOUNCE_TIME);
  const [debouncedPort] = useDebounce(port, DEBOUNCE_TIME);

  useEffect(() => {
    let staleResponse = false;

    const format = async () => {
      const parseOptions = {
        apexStandaloneParser: "built-in",
        apexStandalonePort: debouncedPort,
        apexStandaloneHost: debouncedHost,
        apexStandaloneProtocol: protocol,
        plugins: [prettierApex],
        parser,
        printWidth,
        tabWidth,
        useTabs,
      };
      try {
        const result = await prettier.format(debouncedCode, parseOptions);
        if (!staleResponse) {
          setFormattedCode(result);
        }
      } catch (err: any) {
        if (staleResponse) {
          return;
        }
        if ("message" in err) {
          setFormattedCode(err.message);
        } else {
          setFormattedCode(err);
        }
      }
    };

    format();

    return () => {
      staleResponse = true;
    };
  }, [
    parser,
    debouncedHost,
    debouncedPort,
    protocol,
    printWidth,
    tabWidth,
    useTabs,
    debouncedCode,
  ]);

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
        <OptionEntry label="--protocol" labelHtmlFor="protocol">
          <select
            id="protocol"
            value={protocol}
            onChange={(event) => setProtocol(event.target.value)}
          >
            <option value="http">http</option>
            <option value="https">https</option>
          </select>
        </OptionEntry>
        <OptionEntry label="--parser" labelHtmlFor="parser">
          <select
            id="parser"
            value={parser}
            onChange={(event) => setParser(event.target.value)}
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
            onChange={(event) =>
              setPrintWidth(Number.parseInt(event.target.value, 10))
            }
          />
        </OptionEntry>
        <OptionEntry label="--tab-width" labelHtmlFor="tab-width">
          <input
            type="number"
            id="tab-width"
            value={tabWidth}
            onChange={(event) =>
              setTabWidth(Number.parseInt(event.target.value, 10))
            }
          />
        </OptionEntry>
        <OptionEntry label="--use-tabs" labelHtmlFor="use-tabs">
          <input
            type="checkbox"
            id="use-tabs"
            checked={useTabs}
            onChange={(event) => setUseTabs(event.target.checked)}
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
