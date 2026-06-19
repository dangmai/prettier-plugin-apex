package net.dangmai.serializer.sink;

import java.math.BigDecimal;

/**
 * Streaming, backend-agnostic encoding seam for the serialized jorje AST.
 *
 * <p>The generated, reflection-free serializer walks a parsed AST and drives an
 * {@code AstSink}; a concrete sink turns those calls into bytes. {@link JsonAstSink}
 * is the JSON backend that reproduces the structure XStream used to emit; a binary
 * backend (protobuf, etc.) could implement the same interface later.
 *
 * <p>The shapes this models, as produced by the old XStream pipeline:
 * <ul>
 *   <li><b>Root</b> — {@code {"<rootClassName>": { ...fields... }}} via
 *       {@link #startDocument}/{@link #endDocument}. The root carries no
 *       {@code @class}; its class name is the wrapper key.</li>
 *   <li><b>Classed node</b> — {@code {"@class": "<className>", ...fields...}} via
 *       {@link #startObject(String)}/{@link #endObject}. Used for every object that
 *       appears as a field value or collection element.</li>
 *   <li><b>Plain object</b> — {@code { ...fields... }} via {@link #startObject()}.
 *       Used for {@code Optional}: present is {@code {"value": ...}}, empty is
 *       {@code {}}.</li>
 *   <li><b>Enum / boxed scalar</b> — modeled with the ordinary field name {@code "$"}:
 *       an enum is {@code {"@class": C, "$": "NAME"}}, a boxed collection element is
 *       {@code {"@class": "int", "$": 1}}. No dedicated method is needed — call
 *       {@link #startObject(String)}, {@code name("$")}, a value, then
 *       {@link #endObject}.</li>
 *   <li><b>Array</b> — lists are {@code [item, ...]}; maps are arrays of
 *       {@code [key, value]} tuples (so a map is an outer array of two-element inner
 *       arrays). Both via {@link #startArray}/{@link #endArray}.</li>
 * </ul>
 *
 * <p>Implementations translate any backend I/O failure into an unchecked exception
 * so generated code can call these methods without {@code throws} clauses.
 */
public interface AstSink {
  /** Begins the root document: {@code {"<rootClassName>": {}. */
  void startDocument(String rootClassName);

  /** Ends the root document, closing both the inner object and the wrapper. */
  void endDocument();

  /** Begins a plain object with no {@code @class} discriminator. */
  void startObject();

  /** Begins an object node, writing its {@code @class} discriminator first. */
  void startObject(String className);

  /** Ends the current object. */
  void endObject();

  /** Writes a field name; the next call must write that field's value. */
  void name(String fieldName);

  void valueString(String value);

  void valueLong(long value);

  void valueDouble(double value);

  void valueBoolean(boolean value);

  /** Writes a {@link BigDecimal} as a JSON string to preserve precision. */
  void valueBigDecimal(BigDecimal value);

  void valueNull();

  void startArray();

  void endArray();

  /** Flushes any buffered output to the underlying target. */
  void flush();
}
