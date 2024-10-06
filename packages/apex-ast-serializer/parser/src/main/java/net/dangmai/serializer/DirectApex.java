package net.dangmai.serializer;

import apex.jorje.data.Locations;
import apex.jorje.semantic.compiler.SourceFile;
import apex.jorje.semantic.compiler.parser.ParserOutput;
import apex.jorje.semantic.compiler.parser.StandaloneParserEngine;
import java.io.IOException;

public class DirectApex {

  public static void getAST(Boolean anonymous) throws IOException {
    String sourceCode = "public class Test { }";
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
  }

  public static void main(String[] args) throws IOException {
    getAST(false);
  }
}
