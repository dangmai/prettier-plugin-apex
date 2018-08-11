package net.dangmai.serializer;

import com.gilecode.yagson.YaGsonBuilder;
import com.gilecode.yagson.types.TypeInfoPolicy;
import net.sourceforge.pmd.lang.apex.ApexParser;
import net.sourceforge.pmd.lang.apex.ApexParserOptions;
import net.sourceforge.pmd.lang.ast.Node;
import org.apache.commons.cli.*;

import java.io.*;

public class Apex {
    public static void main(String[] args) throws ParseException, FileNotFoundException {
        Options cliOptions = new Options();
        cliOptions.addOption("l", "location", true, "Location of Apex class file. If not specified, the Apex content will be read from stdin.");
        cliOptions.addOption("p", "pretty", false, "Pretty print output JSON.");
        cliOptions.addOption("h", "help", false, "Print help information.");

        CommandLineParser cliParser = new DefaultParser();
        CommandLine cmd = cliParser.parse(cliOptions, args);
        Reader apexReader;

        if (cmd.hasOption("h")) {
            HelpFormatter helpFormatter = new HelpFormatter();
            helpFormatter.printHelp("apex-ast-serializer", cliOptions);
        } else {
            if (cmd.hasOption("l")) {
                apexReader = new FileReader(cmd.getOptionValue("l"));
            } else {
                apexReader = new BufferedReader(new InputStreamReader(System.in));
            }
            ApexParser parser = new ApexParser(new ApexParserOptions());
            Node topRootNode = parser.parse("", apexReader);

            YaGsonBuilder builder = new YaGsonBuilder().setTypeInfoPolicy(TypeInfoPolicy.DISABLED);
            if (cmd.hasOption("p")) {
                builder.setPrettyPrinting();
            }
            System.out.print(builder.create().toJson(topRootNode));
        }
    }
}
