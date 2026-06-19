package net.dangmai.serializer.sink;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.StringWriter;
import java.math.BigDecimal;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;

/**
 * Drives {@link JsonAstSink} directly (no parsing) to lock in the JSON structure
 * each construct must produce. These shapes mirror what XStream emitted; the
 * generated serializer (a later milestone) drives the same sink for real ASTs.
 */
class JsonAstSinkTest {

  private static String render(boolean prettyPrint, Consumer<AstSink> driver) {
    StringWriter writer = new StringWriter();
    AstSink sink = new JsonAstSink(writer, prettyPrint);
    driver.accept(sink);
    sink.flush();
    return writer.toString();
  }

  private static String compact(Consumer<AstSink> driver) {
    return render(false, driver);
  }

  @Test
  void writesRootDocumentWrapperWithoutClass() {
    String json = compact(sink -> {
      sink.startDocument("apex.jorje.semantic.compiler.parser.ParserOutput");
      sink.name("internalErrors");
      sink.startArray();
      sink.endArray();
      sink.endDocument();
    });
    assertEquals(
      "{\"apex.jorje.semantic.compiler.parser.ParserOutput\":{\"internalErrors\":[]}}",
      json
    );
  }

  @Test
  void writesClassedNodeWithNesting() {
    String json = compact(sink -> {
      sink.startObject("apex.jorje.data.ast.ClassDecl");
      sink.name("loc");
      sink.startObject("apex.jorje.data.IndexLocation");
      sink.name("line");
      sink.valueLong(1);
      sink.endObject();
      sink.endObject();
    });
    assertEquals(
      "{\"@class\":\"apex.jorje.data.ast.ClassDecl\","
        + "\"loc\":{\"@class\":\"apex.jorje.data.IndexLocation\",\"line\":1}}",
      json
    );
  }

  @Test
  void writesEnumAsClassPlusDollarName() {
    String json = compact(sink -> {
      sink.startObject("apex.jorje.data.ast.LiteralType");
      sink.name("$");
      sink.valueString("INTEGER");
      sink.endObject();
    });
    assertEquals("{\"@class\":\"apex.jorje.data.ast.LiteralType\",\"$\":\"INTEGER\"}", json);
  }

  @Test
  void writesBoxedScalarElementAsClassPlusDollarValue() {
    String json = compact(sink -> {
      sink.startObject("int");
      sink.name("$");
      sink.valueLong(32);
      sink.endObject();
    });
    assertEquals("{\"@class\":\"int\",\"$\":32}", json);
  }

  @Test
  void writesBigDecimalAsStringField() {
    String json = compact(sink -> {
      sink.startObject("apex.jorje.data.ast.Expr");
      sink.name("value");
      sink.valueBigDecimal(new BigDecimal("1.0"));
      sink.endObject();
    });
    assertEquals("{\"@class\":\"apex.jorje.data.ast.Expr\",\"value\":\"1.0\"}", json);
  }

  @Test
  void writesPresentOptionalAsValueWrapper() {
    String json = compact(sink -> {
      sink.startObject();
      sink.name("value");
      sink.valueString("x");
      sink.endObject();
    });
    assertEquals("{\"value\":\"x\"}", json);
  }

  @Test
  void writesEmptyOptionalAsEmptyObject() {
    String json = compact(sink -> {
      sink.startObject();
      sink.endObject();
    });
    assertEquals("{}", json);
  }

  @Test
  void writesMapAsArrayOfKeyValueTuples() {
    String json = compact(sink -> {
      sink.startArray();
      sink.startArray();
      sink.startObject("int");
      sink.name("$");
      sink.valueLong(32);
      sink.endObject();
      sink.startObject("apex.jorje.parser.impl.HiddenTokens$BlockComment");
      sink.name("value");
      sink.valueString("/*c*/");
      sink.endObject();
      sink.endArray();
      sink.endArray();
    });
    assertEquals(
      "[[{\"@class\":\"int\",\"$\":32},"
        + "{\"@class\":\"apex.jorje.parser.impl.HiddenTokens$BlockComment\",\"value\":\"/*c*/\"}]]",
      json
    );
  }

  @Test
  void writesEmptyArray() {
    assertEquals("[]", compact(sink -> {
      sink.startArray();
      sink.endArray();
    }));
  }

  @Test
  void writesAllScalarKinds() {
    String json = compact(sink -> {
      sink.startObject("N");
      sink.name("a");
      sink.valueLong(5);
      sink.name("b");
      sink.valueDouble(2.5);
      sink.name("c");
      sink.valueBoolean(true);
      sink.name("d");
      sink.valueNull();
      sink.name("e");
      sink.valueString("hi");
      sink.endObject();
    });
    assertEquals(
      "{\"@class\":\"N\",\"a\":5,\"b\":2.5,\"c\":true,\"d\":null,\"e\":\"hi\"}",
      json
    );
  }

  @Test
  void escapesStringsAsJson() {
    String json = compact(sink -> {
      sink.startObject();
      sink.name("value");
      sink.valueString("line1\n\"quoted\"\tend");
      sink.endObject();
    });
    assertEquals("{\"value\":\"line1\\n\\\"quoted\\\"\\tend\"}", json);
  }

  @Test
  void prettyPrintIsStructurallyEqualToCompact() {
    Consumer<AstSink> driver = sink -> {
      sink.startObject("N");
      sink.name("loc");
      sink.startObject("L");
      sink.name("line");
      sink.valueLong(1);
      sink.endObject();
      sink.name("items");
      sink.startArray();
      sink.endArray();
      sink.endObject();
    };
    String pretty = render(true, driver);
    String compact = render(false, driver);

    assertTrue(pretty.contains("\n"), "pretty output should contain newlines");
    // Values here contain no whitespace, so collapsing whitespace must recover
    // the compact form exactly — i.e. the two are structurally identical.
    assertEquals(compact, pretty.replaceAll("\\s", ""));
  }
}
