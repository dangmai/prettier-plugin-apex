import { useEffect, useRef, useState } from "react";
import { useCodeMirror } from "@uiw/react-codemirror/esm";
import * as prettier from "prettier";
import * as prettierApex from "../src/index.js";

const formatApex = async (
  originalCode: string,
  host: string,
  port: number,
  parser: string,
): Promise<string> => {
  const parseOptions = {
    apexStandaloneParser: "built-in",
    apexStandalonePort: port,
    apexStandaloneHost: host,
    plugins: [prettierApex],
    parser,
  };
  return prettier.format(originalCode, parseOptions);
};

function App() {
  const [parser, setParser] = useState("apex");
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState(2117);
  const [originalCode, setOriginalCode] = useState("");
  const [formattedCode, setFormattedCode] = useState("");
  const originalEditor = useRef<HTMLDivElement>(null);
  const formattedEditor = useRef<HTMLDivElement>(null);

  const { setContainer: setOriginalContainer } = useCodeMirror({
    container: originalEditor.current,
    value: originalCode,
    onChange: async (value) => {
      setOriginalCode(value);
      setFormattedCode(await formatApex(value, host, port, parser));
    },
    height: "100%",
  });
  const { setContainer: setFormattedContainer } = useCodeMirror({
    container: formattedEditor.current,
    value: formattedCode,
    readOnly: true,
    height: "100%",
  });
  useEffect(() => {
    if (originalEditor.current) {
      setOriginalContainer(originalEditor.current);
    }
  }, [originalEditor.current]);
  useEffect(() => {
    if (formattedEditor.current) {
      setFormattedContainer(formattedEditor.current);
    }
  }, [formattedEditor.current]);
  return (
    <div className="grid">
      <div>
        <label htmlFor="host">--host</label>
        <input
          type="text"
          id="host"
          value={host}
          onChange={(event) => setHost(event.target.value)}
        />
        <label htmlFor="port">--port</label>
        <input
          type="number"
          id="port"
          value={port}
          onChange={(event) => setPort(Number.parseInt(event.target.value, 10))}
        />
        <label htmlFor="parser">--parser</label>
        <select
          id="parser"
          value={parser}
          onChange={(event) => setParser(event.target.value)}
        >
          <option value="apex">apex</option>
          <option value="apex-anonymous">apex-anonymous</option>
        </select>
      </div>
      <div ref={originalEditor} />
      <div ref={formattedEditor} />
    </div>
  );
}

export default App;
