package net.dangmai.serializer;

import apex.jorje.data.Locations;
import apex.jorje.semantic.compiler.SourceFile;
import apex.jorje.semantic.compiler.parser.ParserEngine;
import apex.jorje.semantic.compiler.parser.ParserOutput;
import com.thoughtworks.xstream.XStream;
import com.thoughtworks.xstream.converters.MarshallingContext;
import com.thoughtworks.xstream.converters.collections.CollectionConverter;
import com.thoughtworks.xstream.converters.collections.TreeMapConverter;
import com.thoughtworks.xstream.converters.reflection.ReflectionConverter;
import com.thoughtworks.xstream.core.ClassLoaderReference;
import com.thoughtworks.xstream.core.util.CompositeClassLoader;
import com.thoughtworks.xstream.io.ExtendedHierarchicalStreamWriterHelper;
import com.thoughtworks.xstream.io.HierarchicalStreamWriter;
import com.thoughtworks.xstream.io.json.JsonHierarchicalStreamDriver;
import com.thoughtworks.xstream.io.json.JsonWriter;
import com.thoughtworks.xstream.mapper.Mapper;
import com.thoughtworks.xstream.mapper.MapperWrapper;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.io.StringReader;
import java.io.Writer;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.logging.LogManager;
import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.CommandLineParser;
import org.apache.commons.cli.DefaultParser;
import org.apache.commons.cli.HelpFormatter;
import org.apache.commons.cli.Options;
import org.apache.commons.cli.ParseException;
import org.apache.commons.io.IOUtils;

public class Apex {

  static {
    // Install the index-based location factory once, at class initialization,
    // rather than on every parse. Without it comments are not retained
    // correctly. The Apex class is loaded before any getAST call, and on the
    // native image this runs at build time (the package is initialized at
    // build time) so the factory is baked into the image.
    Locations.useIndexFactory();
  }

  private static void setUpXStream(XStream xstream, int mode) {
    xstream.setMode(mode);
    xstream.registerConverter(
      new CustomCollectionConverter(xstream.getMapper())
    );
    xstream.registerConverter(new CustomTreeMapConverter(xstream.getMapper()));

    // Since XStream 1.4.20, XStream has a dedicated Optional converter.
    // However, it doesn't play nice with Optional lists when serializing
    // to JSON, so we use the old ReflectionConverter instead.
    // The downside for this converter is that it only works if access to
    // these libraries are opened manually, but we add those access
    // anyway as part of the Gradle build.
    xstream.registerConverter(
      new ReflectionConverter(
        xstream.getMapper(),
        xstream.getReflectionProvider(),
        Optional.class
      ),
      XStream.PRIORITY_VERY_HIGH
    );
  }

  public static void getAST(
    Boolean anonymous,
    Boolean prettyPrint,
    Reader reader,
    Writer writer
  ) throws IOException {
    String sourceCode = IOUtils.toString(reader);
    reader.close();
    SourceFile sourceFile = SourceFile.builder().setBody(sourceCode).build();
    ParserEngine engine;
    if (anonymous) {
      engine = ParserEngine.get(ParserEngine.Type.ANONYMOUS);
    } else {
      engine = ParserEngine.get(ParserEngine.Type.NAMED);
    }
    ParserOutput output = engine.parse(
      sourceFile,
      ParserEngine.HiddenTokenBehavior.COLLECT_COMMENTS,
      ParserEngine.SoqlParserType.NEW
    );

    // Serializing the output. The XStream instances are cached in XStreams:
    // construction is expensive (reflection-heavy converter registration)
    // and would otherwise be paid on every parse.
    XStream xstream = prettyPrint ? XStreams.PRETTY : XStreams.COMPACT;
    synchronized (xstream) {
      xstream.toXML(output, writer);
    }
  }

  static XStream buildXStream(boolean prettyPrint) {
    Mapper defaultMapper = (new XStream()).getMapper();
    XStream xstream = new XStream(
      null,
      new JsonHierarchicalStreamDriver() {
        @Override
        public HierarchicalStreamWriter createWriter(Writer writer) {
          if (prettyPrint) {
            // By default, JSON is pretty printed
            return super.createWriter(writer);
          }
          JsonWriter.Format format = new JsonWriter.Format(
            new char[0],
            "".toCharArray(),
            JsonWriter.Format.SPACE_AFTER_LABEL |
            JsonWriter.Format.COMPACT_EMPTY_ELEMENT
          );
          return new CustomJsonWriter(writer, format);
        }
      },
      new ClassLoaderReference(new CompositeClassLoader()),
      new WithClassMapper(defaultMapper)
    );
    setUpXStream(xstream, XStream.NO_REFERENCES);
    return xstream;
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
    cliOptions.addOption(
      "s",
      "stream",
      false,
      "Stream mode: serve multiple parse requests over stdin/stdout. " +
      "Each request is a header line `<anonymous flag> <payload byte count>` " +
      "followed by that many bytes of Apex source. Each response is a " +
      "header line `<OK|ERR> <payload byte count>` followed by the payload."
    );
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
    } else if (cmd.hasOption("s")) {
      runStream(System.in, System.out);
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

  // Serves parse requests over stdin/stdout until EOF so that callers pay
  // process startup cost once instead of per parsed file. The framing is
  // byte-count based on both sides, so it makes no assumption about the
  // payload contents.
  static void runStream(InputStream rawIn, OutputStream rawOut)
    throws IOException {
    InputStream in = new BufferedInputStream(rawIn);
    // Buffer stdout so the header and body of a response coalesce into one
    // write, and reuse a single byte buffer across requests. The serialized
    // AST is encoded straight into that buffer and streamed out with writeTo,
    // avoiding the per-request String -> getBytes copies of the whole payload.
    OutputStream out = new BufferedOutputStream(rawOut);
    ByteArrayOutputStream responseBuffer = new ByteArrayOutputStream(65536);
    while (true) {
      String header = readHeaderLine(in);
      if (header == null) {
        return; // EOF - the calling process has closed our stdin
      }
      String[] parts = header.trim().split(" ");
      boolean anonymous = parts[0].equals("1");
      int byteCount = Integer.parseInt(parts[1]);
      byte[] payload = in.readNBytes(byteCount);
      String sourceCode = new String(payload, StandardCharsets.UTF_8);

      try {
        responseBuffer.reset();
        Writer writer = new OutputStreamWriter(
          responseBuffer,
          StandardCharsets.UTF_8
        );
        getAST(anonymous, false, new StringReader(sourceCode), writer);
        writer.flush();
        out.write(
          ("OK " + responseBuffer.size() + "\n").getBytes(
            StandardCharsets.UTF_8
          )
        );
        responseBuffer.writeTo(out);
      } catch (Exception error) {
        String message =
          error.getMessage() == null ? error.toString() : error.getMessage();
        byte[] response = message.getBytes(StandardCharsets.UTF_8);
        out.write(
          ("ERR " + response.length + "\n").getBytes(StandardCharsets.UTF_8)
        );
        out.write(response);
      }
      out.flush();
    }
  }

  // Package-private so CliTest can read stream-mode response frames with the
  // same reader the production loop uses.
  static String readHeaderLine(InputStream in) throws IOException {
    ByteArrayOutputStream line = new ByteArrayOutputStream();
    int b;
    while ((b = in.read()) != -1) {
      if (b == '\n') {
        return line.toString(StandardCharsets.UTF_8);
      }
      line.write(b);
    }
    return line.size() == 0 ? null : line.toString(StandardCharsets.UTF_8);
  }

  // We use this mapper to make sure all classes in the jorje package gets printed out as class attribute
  private static class WithClassMapper extends MapperWrapper {

    // IndexLocation is package-private in jorje, so it has to be looked up
    // reflectively.
    private static final Class<?> INDEX_LOCATION_CLASS;

    // Fully-qualified `@class` names made up ~35% of the serialized AST. We
    // emit a short token ("t" + base36 index into the sorted name list) for
    // every known node class instead, and the JavaScript consumer translates
    // it back during its post-parse walk (see src/apex-class-tokens.ts). The
    // name list is the resource apex-class-tokens.txt, kept in sync with the
    // TypeScript copy by a unit test. Classes absent from the list (e.g. the
    // root ParserOutput, which is emitted as an object key rather than an
    // attribute) keep their full name.
    private static final Map<String, String> CLASS_TO_TOKEN = loadClassTokens();

    static {
      Class<?> indexLocation = null;
      try {
        indexLocation = Class.forName("apex.jorje.data.IndexLocation");
      } catch (ClassNotFoundException e) {
        // Fall through: locations keep their @class attribute.
      }
      INDEX_LOCATION_CLASS = indexLocation;
    }

    private static Map<String, String> loadClassTokens() {
      List<String> names = new ArrayList<>();
      try (
        BufferedReader reader = new BufferedReader(
          new InputStreamReader(
            WithClassMapper.class.getResourceAsStream("apex-class-tokens.txt"),
            StandardCharsets.UTF_8
          )
        )
      ) {
        String line;
        while ((line = reader.readLine()) != null) {
          line = line.trim();
          if (!line.isEmpty()) {
            names.add(line);
          }
        }
      } catch (IOException | NullPointerException e) {
        // Without the resource we fall back to emitting full class names.
        return Collections.emptyMap();
      }
      // Lexicographic sort matches the JavaScript side's default Array sort for
      // these ASCII strings, so both assign the same token to each class.
      Collections.sort(names);
      Map<String, String> tokens = new HashMap<>(names.size() * 2);
      for (int i = 0; i < names.size(); i++) {
        tokens.put(names.get(i), "t" + Integer.toString(i, 36));
      }
      return tokens;
    }

    WithClassMapper(Mapper wrapped) {
      super(wrapped);
    }

    @Override
    public String serializedClass(Class type) {
      String name = super.serializedClass(type);
      String token = CLASS_TO_TOKEN.get(name);
      return token != null ? token : name;
    }

    @Override
    public Class defaultImplementationOf(Class type) {
      // Location fields are always IndexLocation at runtime (we use
      // Locations.useIndexFactory()), and the JavaScript consumer never
      // reads their @class attribute - declaring the default implementation
      // lets XStream omit the attribute on every location node, which
      // meaningfully shrinks the serialized AST.
      if (
        type == apex.jorje.data.Location.class && INDEX_LOCATION_CLASS != null
      ) {
        return INDEX_LOCATION_CLASS;
      }
      if (
        type.getPackage() != null &&
        type.getPackage().getName().startsWith("apex.jorje")
      ) {
        return FakeDefaultImplementation.class;
      }
      return super.defaultImplementationOf(type);
    }

    @Override
    public boolean shouldSerializeMember(Class definedIn, String fieldName) {
      return true;
    }
  }

  private static class FakeDefaultImplementation {}

  // Custom Collection Converter to inject the class attribute on the collection elements
  static class CustomCollectionConverter extends CollectionConverter {

    CustomItemWriter itemWriter;

    public CustomCollectionConverter(Mapper mapper) {
      super(mapper);
      this.itemWriter = new CustomItemWriter(mapper());
    }

    @Override
    public boolean canConvert(Class type) {
      return (
        Collection.class.isAssignableFrom(type) || super.canConvert(type)
      );
    }

    protected void writeCompleteItem(
      Object item,
      MarshallingContext context,
      HierarchicalStreamWriter writer
    ) {
      this.itemWriter.writeItem(item, context, writer);
    }
  }

  // Custom Collection Converter to inject the class attribute on the collection elements
  static class CustomTreeMapConverter extends TreeMapConverter {

    CustomItemWriter itemWriter;

    public CustomTreeMapConverter(Mapper mapper) {
      super(mapper);
      this.itemWriter = new CustomItemWriter(mapper());
    }

    protected void writeCompleteItem(
      Object item,
      MarshallingContext context,
      HierarchicalStreamWriter writer
    ) {
      this.itemWriter.writeItem(item, context, writer);
    }
  }

  // We use a custom JSON writer in order to modify the behavior of writing
  // out a BigDecimal. By default, a BigDecimal is serialized to a JSON Number
  // node, like so: `{"number": 1.0}`.
  // The Javascript consumer, however, will not be able to parse that without
  // dropping the precision. Because of that, we will serialize it this way
  // instead: `{"number": "1.0"}`
  static class CustomJsonWriter extends JsonWriter {

    public CustomJsonWriter(Writer writer, Format format) {
      super(writer, format);
    }

    @Override
    protected Type getType(Class clazz) {
      if (clazz == BigDecimal.class) {
        return Type.STRING;
      }
      return super.getType(clazz);
    }
  }

  static class CustomItemWriter {

    private final Mapper mapper;

    public CustomItemWriter(Mapper mapper) {
      this.mapper = mapper;
    }

    public void writeItem(
      Object item,
      MarshallingContext context,
      HierarchicalStreamWriter writer
    ) {
      // Copied from AbstractCollectionConverter
      String name;
      if (item == null) {
        name = mapper.serializedClass(null);
        ExtendedHierarchicalStreamWriterHelper.startNode(
          writer,
          name,
          Mapper.Null.class
        );
      } else {
        name = mapper.serializedClass(item.getClass());
        ExtendedHierarchicalStreamWriterHelper.startNode(
          writer,
          name,
          item.getClass()
        );
        writer.addAttribute("class", name);
        context.convertAnother(item);
      }
      writer.endNode();
    }
  }
}
