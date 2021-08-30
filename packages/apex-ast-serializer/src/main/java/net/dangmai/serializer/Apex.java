package net.dangmai.serializer;

import apex.jorje.data.Locations;
import apex.jorje.semantic.compiler.SourceFile;
import apex.jorje.semantic.compiler.parser.ParserEngine;
import apex.jorje.semantic.compiler.parser.ParserOutput;
import com.thoughtworks.xstream.XStream;
import com.thoughtworks.xstream.converters.MarshallingContext;
import com.thoughtworks.xstream.converters.collections.CollectionConverter;
import com.thoughtworks.xstream.converters.collections.TreeMapConverter;
import com.thoughtworks.xstream.core.ClassLoaderReference;
import com.thoughtworks.xstream.core.util.CompositeClassLoader;
import com.thoughtworks.xstream.io.ExtendedHierarchicalStreamWriterHelper;
import com.thoughtworks.xstream.io.HierarchicalStreamWriter;
import com.thoughtworks.xstream.io.json.JsonHierarchicalStreamDriver;
import com.thoughtworks.xstream.io.json.JsonWriter;
import com.thoughtworks.xstream.io.xml.CompactWriter;
import com.thoughtworks.xstream.mapper.Mapper;
import com.thoughtworks.xstream.mapper.MapperWrapper;
import org.apache.commons.cli.*;
import org.apache.commons.io.IOUtils;

import java.io.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.logging.LogManager;

public class Apex {
    private static void setUpXStream(XStream xstream, int mode) {
        xstream.setMode(mode);
        xstream.registerConverter(new CustomCollectionConverter(xstream.getMapper()));
        xstream.registerConverter(new CustomTreeMapConverter(xstream.getMapper()));
    }

    public enum OutputFormat { XML, JSON }

    public static void getAST(OutputFormat format, Boolean anonymous, Boolean prettyPrint, Boolean idRef, Reader reader, Writer writer) throws IOException {
        String sourceCode = IOUtils.toString(reader);
        reader.close();
        SourceFile sourceFile = SourceFile.builder().setBody(sourceCode).build();
        ParserEngine engine;
        if (anonymous) {
            engine = ParserEngine.get(ParserEngine.Type.ANONYMOUS);
        } else {
            engine = ParserEngine.get(ParserEngine.Type.NAMED);
        }
        Locations.useIndexFactory();  // without this, comments won't be retained correctly
        ParserOutput output = engine.parse(
                sourceFile,
                ParserEngine.HiddenTokenBehavior.COLLECT_COMMENTS
        );

        // Serializing the output
        int mode;
        if (idRef) {
            mode = XStream.ID_REFERENCES;
        } else {
            mode = XStream.XPATH_ABSOLUTE_REFERENCES;
        }
        Mapper defaultMapper = (new XStream()).getMapper();
        XStream xstream;
        if (format == OutputFormat.JSON) {
            xstream = new XStream(
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
                                    JsonWriter.Format.SPACE_AFTER_LABEL | JsonWriter.Format.COMPACT_EMPTY_ELEMENT
                            );
                            return new CustomJsonWriter(writer, format);
                        }
                    },
                    new ClassLoaderReference(new CompositeClassLoader()),
                    new WithClassMapper(defaultMapper));
            setUpXStream(xstream, mode);

            xstream.toXML(output, writer);
        } else {
            xstream = new XStream();
            setUpXStream(xstream, mode);

            if (prettyPrint) {
                xstream.toXML(output, writer);
            } else {
                xstream.marshal(output, new CompactWriter(writer));
            }
        }
    }

    public static void main(String[] args) throws ParseException, IOException {
        // Disable logging, otherwise jorje puts logs onto stderr,
        // which makes the calling code thinks that something is wrong
        LogManager.getLogManager().reset();

        Options cliOptions = new Options();
        cliOptions.addOption("a", "anonymous", false, "Parse Anonymous Apex code. If not specify, it will be parsed in Named mode.");
        cliOptions.addOption("f", "format", true, "Format of the output. Possible options: json, xml.");
        cliOptions.addOption("l", "location", true, "Location of Apex class file. If not specified, the Apex content will be read from stdin.");
        cliOptions.addOption("p", "pretty", false, "Pretty print output.");
        cliOptions.addOption("i", "id-ref", false, "Use ID reference rather than XPath.");
        cliOptions.addOption("h", "help", false, "Print help information.");

        CommandLineParser cliParser = new DefaultParser();
        CommandLine cmd = cliParser.parse(cliOptions, args);
        Reader apexReader;

        Set<String> acceptedFormats = new HashSet<>(Arrays.asList("xml", "json"));
        String chosenFormat = cmd.getOptionValue("f");

        if (cmd.hasOption("h")) {
            HelpFormatter helpFormatter = new HelpFormatter();
            helpFormatter.printHelp("apex-ast-serializer", cliOptions);
        } else if (!cmd.hasOption("f") || !acceptedFormats.contains(chosenFormat)) {
            System.out.println("Format not specified or not supported.");
        } else {
            if (cmd.hasOption("l")) {
                apexReader = new FileReader(cmd.getOptionValue("l"));
            } else {
                apexReader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
            }
            Writer writer = new OutputStreamWriter(System.out, StandardCharsets.UTF_8);
            OutputFormat format = chosenFormat.equals("json") ? OutputFormat.JSON : OutputFormat.XML;
            Boolean anonymous = cmd.hasOption("a");
            Boolean idRef = cmd.hasOption("i");
            Boolean prettyPrint = cmd.hasOption("p");

            getAST(format, anonymous, prettyPrint, idRef, apexReader, writer);
        }
    }

    // We use this mapper to make sure all classes in the jorje package gets printed out as class attribute
    static private class WithClassMapper extends MapperWrapper {
        WithClassMapper(Mapper wrapped) {
            super(wrapped);
        }

        @Override
        public Class defaultImplementationOf(Class type) {
            if (type.getPackage() != null && type.getPackage().getName().startsWith("apex.jorje")) {
                return FakeDefaultImplementation.class;
            }
            return super.defaultImplementationOf(type);
        }

        @Override
        public boolean shouldSerializeMember(Class definedIn, String fieldName) {
            return true;
        }
    }

    private static class FakeDefaultImplementation {
    }

    // Custom Collection Converter to inject the class attribute on the collection elements
    static class CustomCollectionConverter extends CollectionConverter {
        CustomItemWriter itemWriter;

        public CustomCollectionConverter(Mapper mapper) {
            super(mapper);
            this.itemWriter = new CustomItemWriter(mapper());
        }

        @Override
        public boolean canConvert(Class type) {
            return Collection.class.isAssignableFrom(type) || super.canConvert(type);
        }

        protected void writeCompleteItem(Object item, MarshallingContext context, HierarchicalStreamWriter writer) {
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

        protected void writeCompleteItem(Object item, MarshallingContext context, HierarchicalStreamWriter writer) {
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
        public void writeItem(Object item, MarshallingContext context, HierarchicalStreamWriter writer) {
            // Copied from AbstractCollectionConverter
            String name;
            if (item == null) {
                name = mapper.serializedClass(null);
                ExtendedHierarchicalStreamWriterHelper.startNode(writer, name, Mapper.Null.class);
            } else {
                name = mapper.serializedClass(item.getClass());
                ExtendedHierarchicalStreamWriterHelper.startNode(writer, name, item.getClass());
                writer.addAttribute("class", name);
                context.convertAnother(item);
            }
            writer.endNode();
        }
    }
}
