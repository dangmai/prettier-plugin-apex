/* eslint-disable @typescript-eslint/dot-notation */
import Editor from "@monaco-editor/react";
import endent from "endent";
import * as prettier from "prettier";
import * as prettierApex from "prettier-plugin-apex";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

import { version } from "../package.json";
import icon from "../static/icon.png";
import { ClipboardButton } from "./Buttons.js";
import OptionEntry from "./OptionEntry.js";
import { getStateFromUrl, getUrlWithState } from "./urlHash.js";

const DEBOUNCE_TIME = 500;

let didInit = false;

interface EncodedState {
  options: {
    apexInsertFinalNewline: boolean;
    host: string;
    parser: string;
    port: number;
    printWidth: number;
    tabWidth: number;
    protocol: string;
    useTabs: boolean;
  };
  code: string;
}

function App() {
  const [isFormatting, setIsFormatting] = useState(false);
  const [parser, setParser] = useState("apex");
  const [host, setHost] = useState(
    import.meta.env["VITE_APEX_AST_HOST"] ?? "localhost",
  );
  const [port, setPort] = useState(
    import.meta.env["VITE_APEX_AST_PORT"]
      ? Number.parseInt(import.meta.env["VITE_APEX_AST_PORT"], 10)
      : 2117,
  );
  const [protocol, setProtocol] = useState(
    import.meta.env["VITE_APEX_AST_PROTOCOL"] ?? "http",
  );
  const [printWidth, setPrintWidth] = useState(80);
  const [tabWidth, setTabWidth] = useState(2);
  const [useTabs, setUseTabs] = useState(false);
  const [apexInsertFinalNewline, setApexInsertFinalNewline] = useState(true);
  const [originalCode, setOriginalCode] = useState(endent`
    class HelloWorld {
      void hello() {
        Account[] accounts = [select id from account];
        System.debug(accounts);
      }
    }
  `);
  const [formattedCode, setFormattedCode] = useState("");
  const [hiddenOptions, setHiddenOptions] = useState(false);
  const [debouncedCode] = useDebounce(originalCode, DEBOUNCE_TIME);
  const [debouncedHost] = useDebounce(host, DEBOUNCE_TIME);
  const [debouncedPort] = useDebounce(port, DEBOUNCE_TIME);

  useEffect(() => {
    if (!didInit) {
      didInit = true;
      const state = getStateFromUrl<EncodedState>();
      if (state === null) {
        return;
      }
      setParser(state.options.parser);
      setHost(state.options.host);
      setPort(state.options.port);
      setProtocol(state.options.protocol);
      setPrintWidth(state.options.printWidth);
      setTabWidth(state.options.tabWidth);
      setUseTabs(state.options.useTabs);
      setApexInsertFinalNewline(state.options.apexInsertFinalNewline);
      setOriginalCode(state.code);
    }
  }, []);

  useEffect(() => {
    let staleResponse = false;

    const format = async () => {
      const parseOptions = {
        apexStandaloneParser: "built-in",
        apexStandalonePort: debouncedPort,
        apexStandaloneHost: debouncedHost,
        apexStandaloneProtocol: protocol,
        apexInsertFinalNewline,
        plugins: [prettierApex],
        parser,
        printWidth,
        tabWidth,
        useTabs,
      };
      try {
        setIsFormatting(true);
        const result = await prettier.format(debouncedCode, parseOptions);
        if (staleResponse) {
          return;
        }
        setFormattedCode(result);
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
      setIsFormatting(false);
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
    apexInsertFinalNewline,
    debouncedCode,
  ]);

  return (
    <>
      <header>
        <a
          href="https://github.com/dangmai/prettier-plugin-apex"
          target="_blank"
          rel="noopener"
          className="logo-wrapper"
        >
          <img className="logo" src={icon} alt="" />
          <h1>
            Prettier Apex{" "}
            <span id="version">
              <a
                href={`https://github.com/dangmai/prettier-plugin-apex/releases/tag/v${version}`}
                target="_blank"
                rel="noopener"
              >
                v{version}
              </a>
            </span>
          </h1>
        </a>

        <span className="links">
          <a
            className="github-button"
            target="_blank"
            rel="noopener"
            href="https://github.com/dangmai/prettier-plugin-apex"
            data-show-count="true"
            aria-label="Star prettier-plugin-apex on GitHub"
          >
            GitHub
          </a>
        </span>
      </header>
      <div className="playground-container">
        <div className="editors-container">
          <div
            className={`panels ${
              hiddenOptions ? "panels-half" : "panels-third"
            }`}
          >
            <div className={`options ${hiddenOptions ? "hide" : ""}`}>
              <details open={true} className="sub-options">
                <summary>Global</summary>
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
              </details>
              <details open={true} className="sub-options">
                <summary>Apex</summary>
                <OptionEntry
                  label="--apex-insert-final-newline"
                  labelHtmlFor="apex-insert-final-newline"
                >
                  <input
                    type="checkbox"
                    id="apex-insert-final-newline"
                    checked={apexInsertFinalNewline}
                    onChange={(event) =>
                      setApexInsertFinalNewline(event.target.checked)
                    }
                  />
                </OptionEntry>
              </details>
              <details open={false} className="sub-options">
                <summary>Advanced</summary>
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
              </details>
            </div>

            <Editor
              height="100%"
              defaultLanguage="apex"
              value={originalCode}
              options={{
                minimap: { enabled: false },
                rulers: [printWidth],
                scrollBeyondLastLine: false,
              }}
              onChange={async (value) => {
                if (value === undefined) {
                  return;
                }
                setOriginalCode(value);
              }}
            />
            <div className="formatted-editor">
              <div
                className={`spinner-container ${!isFormatting ? "hide" : ""}`}
              >
                <div className="loading-spinner"></div>
              </div>
              <Editor
                height="100%"
                defaultLanguage="apex"
                value={formattedCode}
                options={{
                  domReadOnly: true,
                  readOnly: true,
                  minimap: { enabled: false },
                  rulers: [printWidth],
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>
        </div>
        <div className="bottom-bar">
          <div className="bottom-bar-buttons">
            <button
              type="button"
              className="btn"
              onClick={() => setHiddenOptions(!hiddenOptions)}
            >
              {hiddenOptions ? "Show" : "Hide"} options
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setOriginalCode("")}
            >
              Clear
            </button>
            <ClipboardButton
              copy={() => {
                const newUrl = getUrlWithState({
                  options: {
                    port: debouncedPort,
                    host: debouncedHost,
                    protocol,
                    parser,
                    printWidth,
                    tabWidth,
                    useTabs,
                    apexInsertFinalNewline,
                  },
                  code: debouncedCode,
                } as EncodedState);
                return newUrl.href;
              }}
            >
              Copy Link
            </ClipboardButton>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()}{" "}
            <a target="_blank" rel="noopener" href="https://dangmai.net">
              Dang Mai
            </a>
            . All rights reserved.
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
