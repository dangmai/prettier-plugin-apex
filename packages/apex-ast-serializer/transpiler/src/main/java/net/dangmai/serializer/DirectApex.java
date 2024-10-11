package net.dangmai.serializer;

import apex.jorje.data.Locations;
import apex.jorje.semantic.compiler.SourceFile;
import apex.jorje.semantic.compiler.parser.ParserOutput;
import apex.jorje.semantic.compiler.parser.StandaloneParserEngine;
import java.io.IOException;
import org.teavm.jso.JSExport;

public class DirectApex {

  @JSExport
  public static ParserOutput getApexAst(String sourceCode, boolean anonymous)
    throws IOException {
    SourceFile sourceFile = SourceFile.builder().setBody(sourceCode).build();
    StandaloneParserEngine engine;
    if (anonymous) {
      engine = StandaloneParserEngine.get(
        StandaloneParserEngine.Type.ANONYMOUS
      );
    } else {
      engine = StandaloneParserEngine.get(StandaloneParserEngine.Type.NAMED);
    }
    Locations.useIndexFactory(); // without this, comments won't be retained correctly
    ParserOutput output = engine.parse(sourceFile);
    return output;
  }
}
