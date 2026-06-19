package net.dangmai.serializer.sink;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.io.Writer;
import java.math.BigDecimal;

/**
 * JSON backend for {@link AstSink}, built on Jackson Core's streaming
 * {@link JsonGenerator} (not databind — no runtime reflection, GraalVM-safe).
 *
 * <p>Reproduces the JSON structure the old XStream pipeline emitted; see
 * {@link AstSink} for the shapes. The {@code @class} discriminator is written as
 * the first field of each classed object.
 */
public final class JsonAstSink implements AstSink {

  private static final String CLASS_FIELD = "@class";

  // AUTO_CLOSE_TARGET is disabled so closing/flushing the generator never closes
  // the caller's Writer — the long-running server reuses a single StringWriter.
  private static final JsonFactory FACTORY = new JsonFactory()
    .disable(JsonGenerator.Feature.AUTO_CLOSE_TARGET);

  private final JsonGenerator generator;

  public JsonAstSink(Writer writer, boolean prettyPrint) {
    try {
      this.generator = FACTORY.createGenerator(writer);
    } catch (IOException e) {
      throw new UncheckedIOException("Failed to create JSON generator", e);
    }
    if (prettyPrint) {
      generator.useDefaultPrettyPrinter();
    }
  }

  @Override
  public void startDocument(String rootClassName) {
    run(() -> {
      generator.writeStartObject();
      generator.writeFieldName(rootClassName);
      generator.writeStartObject();
    });
  }

  @Override
  public void endDocument() {
    run(() -> {
      generator.writeEndObject();
      generator.writeEndObject();
    });
  }

  @Override
  public void startObject() {
    run(generator::writeStartObject);
  }

  @Override
  public void startObject(String className) {
    run(() -> {
      generator.writeStartObject();
      generator.writeStringField(CLASS_FIELD, className);
    });
  }

  @Override
  public void endObject() {
    run(generator::writeEndObject);
  }

  @Override
  public void name(String fieldName) {
    run(() -> generator.writeFieldName(fieldName));
  }

  @Override
  public void valueString(String value) {
    run(() -> generator.writeString(value));
  }

  @Override
  public void valueLong(long value) {
    run(() -> generator.writeNumber(value));
  }

  @Override
  public void valueDouble(double value) {
    run(() -> generator.writeNumber(value));
  }

  @Override
  public void valueBoolean(boolean value) {
    run(() -> generator.writeBoolean(value));
  }

  @Override
  public void valueBigDecimal(BigDecimal value) {
    // Emitted as a JSON string: the JS consumer would otherwise lose precision
    // parsing it as a Number (e.g. 1.0 -> 1).
    run(() -> generator.writeString(value.toString()));
  }

  @Override
  public void valueNull() {
    run(generator::writeNull);
  }

  @Override
  public void startArray() {
    run(generator::writeStartArray);
  }

  @Override
  public void endArray() {
    run(generator::writeEndArray);
  }

  @Override
  public void flush() {
    run(generator::flush);
  }

  @FunctionalInterface
  private interface JsonOp {
    void run() throws IOException;
  }

  private static void run(JsonOp op) {
    try {
      op.run();
    } catch (IOException e) {
      throw new UncheckedIOException("Failed to write JSON", e);
    }
  }
}
