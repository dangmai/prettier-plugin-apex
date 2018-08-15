package net.dangmai.serializer;

import com.gilecode.yagson.YaGsonBuilder;
import com.gilecode.yagson.types.TypeInfoPolicy;
import com.thoughtworks.xstream.XStream;
import net.sourceforge.pmd.lang.apex.ApexParser;
import net.sourceforge.pmd.lang.apex.ApexParserOptions;
import net.sourceforge.pmd.lang.ast.Node;
import org.apache.commons.cli.*;

import java.io.*;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class Apex {
    public static void main(String[] args) throws ParseException, FileNotFoundException {
        Options cliOptions = new Options();
        cliOptions.addOption("f", "format", true, "Format of the output. Possible options: json, xml.");
        cliOptions.addOption("l", "location", true, "Location of Apex class file. If not specified, the Apex content will be read from stdin.");
        cliOptions.addOption("t", "type", false, "JSON format only: Include details type information.");
        cliOptions.addOption("p", "pretty", false, "JSON format only: Pretty print output.");
        cliOptions.addOption("i", "id-ref", false, "XML format only: Use ID reference rather than XPath.");
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
                apexReader = new BufferedReader(new InputStreamReader(System.in));
            }
            ApexParser parser = new ApexParser(new ApexParserOptions());
            Node topRootNode = parser.parse("", apexReader);

            if (chosenFormat.equals("json")) {
                YaGsonBuilder builder = new YaGsonBuilder();

                if (!cmd.hasOption("t")) {
                    builder.setTypeInfoPolicy(TypeInfoPolicy.DISABLED);
                }
                if (cmd.hasOption("p")) {
                    builder.setPrettyPrinting();
                }
                System.out.print(builder.create().toJson(topRootNode));
            } else {
                XStream xstream = new XStream();

                if (cmd.hasOption("i")) {
                    xstream.setMode(XStream.ID_REFERENCES);
                } else {
                    xstream.setMode(XStream.XPATH_ABSOLUTE_REFERENCES);
                }
                System.out.println(xstream.toXML(topRootNode));
            }
        }
    }
}
