package net.dangmai.serializer;

import static org.junit.jupiter.api.Assumptions.assumeTrue;

import apex.jorje.data.Locations;
import apex.jorje.semantic.compiler.SourceFile;
import apex.jorje.semantic.compiler.parser.ParserEngine;
import apex.jorje.semantic.compiler.parser.ParserOutput;
import java.io.StringWriter;
import java.util.Arrays;
import net.dangmai.serializer.generated.GeneratedAstSerializer;
import org.junit.jupiter.api.Test;

/**
 * Warm in-JVM comparison of XStream vs the generated serializer on a large AST.
 * Not a CI test — run on demand with {@code -DrunBenchmark=true} to confirm the
 * serialize-step win before/around cutover. Isolates the serialize step (parse
 * happens once, up front), unlike the end-to-end harness whose JVM-startup noise
 * dominates absolute numbers.
 */
class SerializerBenchmark {

  private static final int WARMUP = 30;
  private static final int ITERATIONS = 80;

  private static String largeSource(int methods) {
    StringBuilder sb = new StringBuilder("public class Big {\n");
    for (int i = 0; i < methods; i++) {
      sb.append("  public Integer m").append(i).append("(Integer a, String b) {\n")
        .append("    Integer x = a + ").append(i).append(";\n")
        .append("    List<String> items = new List<String>{ 'a', 'b', b };\n")
        .append("    for (Integer j = 0; j < x; j++) { x += j * 2; }\n")
        .append("    if (x > 10 && b != null) { return x; } else { return ").append(i).append("; }\n")
        .append("  }\n");
    }
    sb.append("}\n");
    return sb.toString();
  }

  private static long median(long[] xs) {
    long[] copy = xs.clone();
    Arrays.sort(copy);
    return copy[copy.length / 2];
  }

  @Test
  void compareSerializers() {
    assumeTrue(
      "true".equals(System.getenv("RUN_BENCHMARK")) || Boolean.getBoolean("runBenchmark"),
      "set RUN_BENCHMARK=true to run"
    );

    String source = largeSource(400);
    SourceFile sourceFile = SourceFile.builder().setBody(source).build();
    Locations.useIndexFactory();
    ParserOutput output = ParserEngine.get(ParserEngine.Type.NAMED).parse(
      sourceFile,
      ParserEngine.HiddenTokenBehavior.COLLECT_COMMENTS,
      ParserEngine.SoqlParserType.NEW
    );
    int payloadBytes = serializeGenerated(output).length();
    System.out.println("Source ~" + source.split("\n").length + " lines, payload ~"
      + payloadBytes + " bytes");

    long[] xstream = new long[ITERATIONS];
    long[] generated = new long[ITERATIONS];
    for (int i = 0; i < WARMUP; i++) {
      serializeXStream(output);
      serializeGenerated(output);
    }
    for (int i = 0; i < ITERATIONS; i++) {
      long t0 = System.nanoTime();
      serializeXStream(output);
      xstream[i] = System.nanoTime() - t0;
      long t1 = System.nanoTime();
      serializeGenerated(output);
      generated[i] = System.nanoTime() - t1;
    }

    double xMs = median(xstream) / 1_000_000.0;
    double gMs = median(generated) / 1_000_000.0;
    System.out.printf("XStream   median: %.3f ms%n", xMs);
    System.out.printf("Generated median: %.3f ms%n", gMs);
    System.out.printf("Speedup: %.1fx (%.3f -> %.3f ms)%n", xMs / gMs, xMs, gMs);
  }

  private static String serializeXStream(ParserOutput output) {
    StringWriter w = new StringWriter();
    Apex.serializeToXStream(output, w, false);
    return w.toString();
  }

  private static String serializeGenerated(ParserOutput output) {
    StringWriter w = new StringWriter();
    GeneratedAstSerializer.serialize(output, w, false);
    return w.toString();
  }
}
