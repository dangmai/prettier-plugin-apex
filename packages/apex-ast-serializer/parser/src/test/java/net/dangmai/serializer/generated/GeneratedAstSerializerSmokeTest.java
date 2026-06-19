package net.dangmai.serializer.generated;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertTrue;

import apex.jorje.data.Locations;
import apex.jorje.semantic.compiler.SourceFile;
import apex.jorje.semantic.compiler.parser.ParserEngine;
import apex.jorje.semantic.compiler.parser.ParserOutput;
import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonParser;
import java.io.StringWriter;
import org.junit.jupiter.api.Test;

/**
 * M4 smoke test: parse a tiny class with jorje and serialize it through the
 * generated, reflection-free serializer, asserting the output is well-formed
 * JSON with the expected top-level shape. Full structural parity with XStream is
 * verified separately by the parity oracle (a later milestone).
 */
class GeneratedAstSerializerSmokeTest {

  private static ParserOutput parse(String source) {
    SourceFile sourceFile = SourceFile.builder().setBody(source).build();
    Locations.useIndexFactory();
    ParserEngine engine = ParserEngine.get(ParserEngine.Type.NAMED);
    return engine.parse(
      sourceFile,
      ParserEngine.HiddenTokenBehavior.COLLECT_COMMENTS,
      ParserEngine.SoqlParserType.NEW
    );
  }

  private static String serialize(ParserOutput output) {
    StringWriter writer = new StringWriter();
    GeneratedAstSerializer.serialize(output, writer, false);
    return writer.toString();
  }

  private static boolean isWellFormedJson(String json) {
    try (JsonParser parser = new JsonFactory().createParser(json)) {
      while (parser.nextToken() != null) {
        // drain all tokens; malformed input throws
      }
      return true;
    } catch (Exception e) {
      return false;
    }
  }

  @Test
  void serializesTinyClassToWellFormedJson() {
    String json = serialize(parse("class A { Integer x = 1; }"));
    assertTrue(isWellFormedJson(json), () -> "Not valid JSON: " + json);
    assertTrue(
      json.contains("\"apex.jorje.semantic.compiler.parser.ParserOutput\""),
      "Should be wrapped by the ParserOutput root key"
    );
    assertTrue(
      json.contains("\"@class\":\"apex.jorje.data.ast.CompilationUnit$ClassDeclUnit\""),
      () -> "Should contain the class-decl unit node: " + json
    );
  }

  @Test
  void serializesClassWithCommentAndExpression() {
    // Exercises the hidden-token map (comments), an enum, and an Object literal.
    String json = serialize(parse("public class A { Integer x = 1 + 2; /* c */ }"));
    assertTrue(isWellFormedJson(json), () -> "Not valid JSON: " + json);
    assertTrue(json.contains("\"$\":\"ADDITION\""), () -> "Should contain the BinaryOp enum: " + json);
  }

  @Test
  void serializesAnonymousApex() {
    SourceFile sourceFile = SourceFile.builder().setBody("Integer x = 1;").build();
    Locations.useIndexFactory();
    ParserOutput output = ParserEngine.get(ParserEngine.Type.ANONYMOUS).parse(
      sourceFile,
      ParserEngine.HiddenTokenBehavior.COLLECT_COMMENTS,
      ParserEngine.SoqlParserType.NEW
    );
    assertDoesNotThrow(() -> {
      String json = serialize(output);
      assertTrue(isWellFormedJson(json), () -> "Not valid JSON: " + json);
    });
  }
}
