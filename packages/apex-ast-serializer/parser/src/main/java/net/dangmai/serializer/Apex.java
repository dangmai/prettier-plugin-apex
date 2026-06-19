package net.dangmai.serializer;

import apex.jorje.data.Locations;
import apex.jorje.semantic.compiler.SourceFile;
import apex.jorje.semantic.compiler.parser.ParserEngine;
import apex.jorje.semantic.compiler.parser.ParserOutput;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;
import java.util.logging.LogManager;
import net.dangmai.serializer.generated.GeneratedAstSerializer;
import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.CommandLineParser;
import org.apache.commons.cli.DefaultParser;
import org.apache.commons.cli.HelpFormatter;
import org.apache.commons.cli.Options;
import org.apache.commons.cli.ParseException;
import org.apache.commons.io.IOUtils;

public class Apex {

  public static void getAST(
    Boolean anonymous,
    Boolean prettyPrint,
    Reader reader,
    Writer writer
  ) throws IOException {
    String sourceCode = IOUtils.toString(reader);
    reader.close();
    SourceFile sourceFile = SourceFile.builder().setBody(sourceCode).build();
    long parseStartNs = System.nanoTime();
    ParserEngine engine;
    if (anonymous) {
      engine = ParserEngine.get(ParserEngine.Type.ANONYMOUS);
    } else {
      engine = ParserEngine.get(ParserEngine.Type.NAMED);
    }
    Locations.useIndexFactory(); // without this, comments won't be retained correctly
    ParserOutput output = engine.parse(
      sourceFile,
      ParserEngine.HiddenTokenBehavior.COLLECT_COMMENTS,
      ParserEngine.SoqlParserType.NEW
    );
    long parseEndNs = System.nanoTime();

    // Serialize the AST with the generated, reflection-free serializer.
    GeneratedAstSerializer.serialize(output, writer, prettyPrint);
    long serializeEndNs = System.nanoTime();

    // Performance harness: when a perf file is configured, write jorje parse
    // vs serialize timings to it. This keeps the stdout payload untouched and
    // is inert outside benchmarking. The path comes from the `apexPerfFile`
    // system property (used by tests) or the APEX_PERF_FILE environment
    // variable (used by the Node perf harness).
    // Only configure this from a short-lived per-invocation CLI process; never
    // set it in the long-running server, where concurrent requests would race
    // on a single file.
    String perfFile = System.getProperty(
      "apexPerfFile",
      System.getenv("APEX_PERF_FILE")
    );
    if (perfFile != null && !perfFile.isEmpty()) {
      Files.writeString(
        Path.of(perfFile),
        "{\"parseNs\":" +
          (parseEndNs - parseStartNs) +
          ",\"serializeNs\":" +
          (serializeEndNs - parseEndNs) +
          "}"
      );
    }
  }

  public static void main(String[] args) throws ParseException, IOException {
    // Disable logging, otherwise jorje puts logs onto stderr,
    // which makes the calling code thinks that something is wrong
    LogManager.getLogManager().reset();

    Options cliOptions = new Options();
    cliOptions.addOption(
      "a",
      "anonymous",
      false,
      "Parse Anonymous Apex code. If not specify, it will be parsed in Named mode."
    );
    cliOptions.addOption(
      "l",
      "location",
      true,
      "Location of Apex class file. If not specified, the Apex content will be read from stdin."
    );
    cliOptions.addOption("p", "pretty", false, "Pretty print output.");
    cliOptions.addOption("h", "help", false, "Print help information.");
    cliOptions.addOption("v", "version", false, "Print version information.");

    CommandLineParser cliParser = new DefaultParser();
    CommandLine cmd = cliParser.parse(cliOptions, args);
    Reader apexReader;

    if (cmd.hasOption("h")) {
      HelpFormatter helpFormatter = new HelpFormatter();
      helpFormatter.printHelp("apex-ast-serializer", cliOptions);
    } else if (cmd.hasOption("v")) {
      try (
        InputStreamReader reader = new InputStreamReader(
          Apex.class.getResourceAsStream("/parser.properties"),
          StandardCharsets.UTF_8
        )
      ) {
        Properties properties = new Properties();
        properties.load(reader);
        String version = properties.getProperty("version");
        System.out.println("v" + version);
      } catch (IOException e) {
        System.err.println("Failed to read version information.");
        e.printStackTrace();
      }
    } else {
      if (cmd.hasOption("l")) {
        apexReader = new FileReader(
          cmd.getOptionValue("l"),
          StandardCharsets.UTF_8
        );
      } else {
        apexReader = new BufferedReader(
          new InputStreamReader(System.in, StandardCharsets.UTF_8)
        );
      }
      Writer writer = new OutputStreamWriter(
        System.out,
        StandardCharsets.UTF_8
      );
      Boolean anonymous = cmd.hasOption("a");
      Boolean prettyPrint = cmd.hasOption("p");

      getAST(anonymous, prettyPrint, apexReader, writer);
    }
  }
}
