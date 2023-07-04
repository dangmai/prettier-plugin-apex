import * as prettier from "prettier";
import * as prettierApex from "../src/index.js";

const formatApex = () => {
  const host = document.querySelector<HTMLInputElement>("input#host")?.value;
  const port = document.querySelector<HTMLInputElement>("input#port")?.value;
  const originalText =
    document.querySelector<HTMLTextAreaElement>("textarea#original")?.value;
  if (host === undefined || port === undefined || originalText === undefined) {
    return;
  }
  const parseOptions = {
    apexStandaloneParser: "built-in",
    apexStandalonePort: Number.parseInt(port, 10),
    apexStandaloneHost: host,
    plugins: [prettierApex],
    parser: "apex",
  };
  prettier.format(originalText, parseOptions).then((formatted) => {
    const formattedTextElement =
      document.querySelector<HTMLTextAreaElement>("textarea#formatted");
    if (formattedTextElement) {
      formattedTextElement.value = formatted;
    }
  });
};

document.getElementById("submit")?.addEventListener("click", (event) => {
  formatApex();
  event.preventDefault();
});
