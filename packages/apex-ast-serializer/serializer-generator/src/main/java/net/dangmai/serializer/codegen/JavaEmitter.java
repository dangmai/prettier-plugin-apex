package net.dangmai.serializer.codegen;

import java.util.List;

/**
 * Emits the {@code GeneratedAstSerializer} Java source from a list of
 * {@link TypeModel}s. The runtime dispatch helpers are a fixed template; only the
 * per-type field writers and the class-name switch are generated.
 */
final class JavaEmitter {

  static final String PACKAGE = "net.dangmai.serializer.generated";
  static final String CLASS_NAME = "GeneratedAstSerializer";

  private JavaEmitter() {}

  static String emit(List<TypeModel> models) {
    // Generated field-writer method names must be unique (the . -> _ / $ -> _
    // mapping is not injective in theory). Fail loudly rather than emit a
    // duplicate-method compile error.
    java.util.Set<String> methodNames = new java.util.HashSet<>();
    for (TypeModel model : models) {
      if (!methodNames.add(methodName(model.className))) {
        throw new IllegalStateException(
          "Duplicate generated method name for type: " + model.className
        );
      }
    }

    StringBuilder sb = new StringBuilder();
    sb.append("package ").append(PACKAGE).append(";\n\n");
    sb.append("""
      import java.io.Writer;
      import java.math.BigDecimal;
      import java.util.Collection;
      import java.util.Map;
      import java.util.Optional;
      import net.dangmai.serializer.sink.AstSink;
      import net.dangmai.serializer.sink.JsonAstSink;

      // GENERATED CODE — DO NOT EDIT.
      // Produced by net.dangmai.serializer.codegen.SerializerGenerator.
      // Reproduces the JSON structure the old XStream pipeline emitted, without
      // any runtime reflection.
      public final class GeneratedAstSerializer {

        private GeneratedAstSerializer() {}

        /** Serializes a parsed AST root (a ParserOutput) as the wrapper document. */
        public static void serialize(Object root, Writer writer, boolean prettyPrint) {
          AstSink sink = new JsonAstSink(writer, prettyPrint);
          String cn = root.getClass().getName();
          sink.startDocument(cn);
          writeFields(root, cn, sink);
          sink.endDocument();
          sink.flush();
        }

        /** Writes an object as a classed node: {"@class": cn, ...fields}. */
        public static void writeNode(Object o, AstSink sink) {
          String cn = o.getClass().getName();
          sink.startObject(cn);
          writeFields(o, cn, sink);
          sink.endObject();
        }

        /** Dispatches a value on its runtime type, reproducing XStream's wrapping. */
        public static void writeValue(Object o, AstSink sink) {
          if (o == null) {
            sink.valueNull();
          } else if (o instanceof String v) {
            box(sink, "string"); sink.valueString(v); sink.endObject();
          } else if (o instanceof Integer v) {
            box(sink, "int"); sink.valueLong(v); sink.endObject();
          } else if (o instanceof Long v) {
            box(sink, "long"); sink.valueLong(v); sink.endObject();
          } else if (o instanceof Short v) {
            box(sink, "short"); sink.valueLong(v); sink.endObject();
          } else if (o instanceof Byte v) {
            box(sink, "byte"); sink.valueLong(v); sink.endObject();
          } else if (o instanceof Boolean v) {
            box(sink, "boolean"); sink.valueBoolean(v); sink.endObject();
          } else if (o instanceof Double v) {
            box(sink, "double"); sink.valueDouble(v); sink.endObject();
          } else if (o instanceof Float v) {
            box(sink, "float"); sink.valueDouble(v); sink.endObject();
          } else if (o instanceof Character v) {
            box(sink, "char"); sink.valueString(String.valueOf(v)); sink.endObject();
          } else if (o instanceof BigDecimal v) {
            box(sink, "big-decimal"); sink.valueBigDecimal(v); sink.endObject();
          } else if (o instanceof Enum<?> v) {
            sink.startObject(v.getDeclaringClass().getName());
            sink.name("$"); sink.valueString(v.name()); sink.endObject();
          } else if (o instanceof Optional<?> v) {
            sink.startObject();
            if (v.isPresent()) { sink.name("value"); writeValue(v.get(), sink); }
            sink.endObject();
          } else if (o instanceof Map<?, ?> v) {
            sink.startArray();
            for (Map.Entry<?, ?> e : v.entrySet()) {
              sink.startArray();
              writeValue(e.getKey(), sink);
              writeValue(e.getValue(), sink);
              sink.endArray();
            }
            sink.endArray();
          } else if (o instanceof Collection<?> v) {
            sink.startArray();
            for (Object e : v) { writeValue(e, sink); }
            sink.endArray();
          } else if (o instanceof java.time.temporal.TemporalAccessor) {
            // jorje stores SOQL date/time literals as java.time values; XStream
            // rendered them as bare strings. The printer reprints date-time/time
            // from the source text and QueryDate (LocalDate) round-trips via
            // toString(), so emitting toString() here is output-safe.
            sink.valueString(o.toString());
          } else {
            // No Java-array branch on purpose: no jorje field is array-typed, so
            // this is unreachable today. A future array field would fall through
            // to writeNode and fail loudly (unknown @class) rather than emit a
            // wrong shape -- the closed-world contract surfacing a jorje change.
            writeNode(o, sink);
          }
        }

        private static void box(AstSink sink, String className) {
          sink.startObject(className);
          sink.name("$");
        }
      """);

    // Generated dispatch: class name -> per-type field writer.
    sb.append("\n  static void writeFields(Object o, String cn, AstSink sink) {\n");
    sb.append("    switch (cn) {\n");
    for (TypeModel model : models) {
      sb.append("      case \"").append(model.className).append("\" -> ")
        .append(methodName(model.className)).append("(o, sink);\n");
    }
    sb.append("      default -> throw new IllegalStateException("
      + "\"No serializer generated for type: \" + cn);\n");
    sb.append("    }\n  }\n");

    // Generated per-type field writers.
    for (TypeModel model : models) {
      sb.append("\n  private static void ").append(methodName(model.className))
        .append("(Object o, AstSink sink) {\n");
      int localVar = 0;
      for (TypeModel.FieldModel field : model.fields) {
        String read = "((" + field.castType + ") o)" + field.accessSuffix;
        if (field.primitive) {
          sb.append("    sink.name(\"").append(field.jsonName).append("\");\n");
          sb.append("    ").append(valueCall(field, read)).append(";\n");
        } else {
          // XStream omits null fields entirely; also, reading a null wrapper
          // inline would NPE on unboxing. Read once and skip when null.
          String var = "v" + (localVar++);
          sb.append("    var ").append(var).append(" = ").append(read).append(";\n");
          sb.append("    if (").append(var).append(" != null) {\n");
          sb.append("      sink.name(\"").append(field.jsonName).append("\");\n");
          sb.append("      ").append(valueCall(field, var)).append(";\n");
          sb.append("    }\n");
        }
      }
      sb.append("  }\n");
    }

    sb.append("}\n");
    return sb.toString();
  }

  private static String valueCall(TypeModel.FieldModel field, String read) {
    if (field.inlineKind == null) {
      return "writeValue((Object) (" + read + "), sink)";
    }
    return switch (field.inlineKind) {
      case STRING -> "sink.valueString(" + read + ")";
      case LONG -> "sink.valueLong(" + read + ")";
      case DOUBLE -> "sink.valueDouble(" + read + ")";
      case BOOLEAN -> "sink.valueBoolean(" + read + ")";
      case CHAR -> "sink.valueString(String.valueOf(" + read + "))";
      case BIG_DECIMAL -> "sink.valueBigDecimal(" + read + ")";
    };
  }

  /** A unique, valid Java method name for a class's field writer. */
  private static String methodName(String className) {
    return "fields_" + className.replace('.', '_').replace('$', '_');
  }
}
