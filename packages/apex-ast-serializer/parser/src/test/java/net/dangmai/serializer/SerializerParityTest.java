package net.dangmai.serializer;

import static org.junit.jupiter.api.Assertions.fail;

import apex.jorje.data.Locations;
import apex.jorje.semantic.compiler.SourceFile;
import apex.jorje.semantic.compiler.parser.ParserEngine;
import apex.jorje.semantic.compiler.parser.ParserOutput;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;
import java.io.IOException;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;
// (jorje AST trees are deep; the recursive diff above bounds work per file.)

/**
 * The migration oracle: serializes every corpus file with both the legacy XStream
 * pipeline and the generated serializer, then asserts the two JSON trees are
 * <em>structurally</em> equal (object key order and whitespace ignored; array
 * order respected). The generated serializer is iterated until this is clean;
 * once cut over, this guards against regressions.
 */
class SerializerParityTest {

  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final int MAX_DIFFS_PER_FILE = 25;

  private static ParserOutput parse(String source, boolean anonymous) {
    SourceFile sourceFile = SourceFile.builder().setBody(source).build();
    Locations.useIndexFactory();
    ParserEngine engine =
      ParserEngine.get(anonymous ? ParserEngine.Type.ANONYMOUS : ParserEngine.Type.NAMED);
    return engine.parse(
      sourceFile,
      ParserEngine.HiddenTokenBehavior.COLLECT_COMMENTS,
      ParserEngine.SoqlParserType.NEW
    );
  }

  @Test
  void generatedMatchesXStreamOverCorpus() throws IOException {
    List<File> files = TestUtilities.getApexTestFiles();
    // Distinct diff signature -> [count, example]. Grouped so each fix cycle sees
    // the variety of gaps, not just the first file's first difference.
    Map<String, int[]> counts = new LinkedHashMap<>();
    Map<String, String> examples = new LinkedHashMap<>();
    int filesWithDiffs = 0;

    for (File file : files) {
      List<String> diffs = new ArrayList<>();
      try {
        String source = Files.readString(file.toPath(), StandardCharsets.UTF_8);
        ParserOutput output = parse(source, false);

        StringWriter xstreamOut = new StringWriter();
        Apex.serializeToXStream(output, xstreamOut, false);
        StringWriter generatedOut = new StringWriter();
        net.dangmai.serializer.generated.GeneratedAstSerializer.serialize(
          output, generatedOut, false
        );

        JsonNode expected = MAPPER.readTree(xstreamOut.toString());
        JsonNode actual = MAPPER.readTree(generatedOut.toString());
        collectDiffs(expected, actual, "$", diffs);
      } catch (Exception e) {
        // Record (don't abort) so one run surfaces every missing type / failure
        // across the whole corpus, not just the first file's first problem.
        diffs.add("EXCEPTION: " + e.getClass().getSimpleName() + ": " + e.getMessage());
      }
      if (!diffs.isEmpty()) {
        filesWithDiffs++;
        for (String diff : diffs) {
          String signature = signature(diff);
          counts.computeIfAbsent(signature, k -> new int[1])[0]++;
          examples.putIfAbsent(signature, file.getName() + " " + diff);
        }
      }
    }

    if (!counts.isEmpty()) {
      StringBuilder report = new StringBuilder();
      report.append(filesWithDiffs).append("/").append(files.size())
        .append(" files differ. Distinct diff signatures (")
        .append(counts.size()).append("):\n");
      // Most frequent first.
      counts.entrySet().stream()
        .sorted((a, b) -> Integer.compare(b.getValue()[0], a.getValue()[0]))
        .forEach(e -> report.append("  [").append(e.getValue()[0]).append("x] ")
          .append(examples.get(e.getKey())).append("\n"));
      fail(report.toString());
    }
  }

  /** Normalizes a concrete diff message into a grouping key (array indices -> [*]). */
  private static String signature(String diff) {
    return diff.replaceAll("\\[\\d+\\]", "[*]");
  }

  /** Collects structural differences; {@code a} is XStream (expected), {@code b} generated. */
  private static void collectDiffs(JsonNode a, JsonNode b, String path, List<String> out) {
    if (out.size() >= MAX_DIFFS_PER_FILE) {
      return;
    }
    if (a.getNodeType() != b.getNodeType()) {
      out.add(path + ": type " + a.getNodeType() + " != " + b.getNodeType());
      return;
    }
    if (a.isObject()) {
      if (isErrorListElement(path)) {
        // XStream dumps the whole Throwable graph here (detailMessage, cause,
        // stackTrace, suppressedExceptions, ...). The plugin only reads
        // parseErrors[].message, and the printer never runs on parse-error
        // files, so we deliberately serialize just the jorje fields. Compare
        // only `message` — the one field that drives behavior.
        if (a.has("message") && !b.has("message")) {
          out.add(path + ".message: missing field in generated");
        } else if (a.has("message")) {
          collectDiffs(a.get("message"), b.get("message"), path + ".message", out);
        }
        return;
      }
      TreeSet<String> names = new TreeSet<>();
      a.fieldNames().forEachRemaining(names::add);
      b.fieldNames().forEachRemaining(names::add);
      for (String name : names) {
        if (out.size() >= MAX_DIFFS_PER_FILE) {
          return;
        }
        if (!a.has(name)) {
          out.add(path + "." + name + ": extra field in generated");
        } else if (!b.has(name)) {
          out.add(path + "." + name + ": missing field in generated");
        } else {
          collectDiffs(a.get(name), b.get(name), path + "." + name, out);
        }
      }
    } else if (a.isArray()) {
      if (a.size() != b.size()) {
        out.add(path + ": array size " + a.size() + " != " + b.size());
        return;
      }
      for (int i = 0; i < a.size(); i++) {
        collectDiffs(a.get(i), b.get(i), path + "[" + i + "]", out);
      }
    } else if (!a.equals(b)) {
      if (isDateTimeLiteral(a) && isDateTimeLiteral(b)) {
        // SOQL date-time/time literals (java.time): XStream and toString() format
        // them differently, but the printer reprints these from the source text
        // (QueryDateTime/QueryTime use originalText.slice), so output is
        // unaffected. QueryDate (LocalDate) round-trips identically, so it never
        // lands here.
        return;
      }
      out.add(path + ": value " + truncate(a) + " != " + truncate(b));
    }
  }

  private static boolean isErrorListElement(String path) {
    return path.matches(".*\\.(parseErrors|internalErrors)\\[\\d+\\]$");
  }

  private static boolean isDateTimeLiteral(JsonNode node) {
    return node.isTextual() && node.asText().matches("^\\d{4}-\\d\\d-\\d\\dT.*");
  }

  private static String truncate(JsonNode node) {
    String s = node.toString();
    return s.length() > 40 ? s.substring(0, 40) + "…" : s;
  }
}
