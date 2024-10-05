package net.dangmai.serializer;

import apex.jorje.data.Locations;
import apex.jorje.semantic.compiler.SourceFile;
import apex.jorje.semantic.compiler.parser.ParserEngine;
import apex.jorje.semantic.compiler.parser.ParserOutput;
import java.io.IOException;

public class DirectApex {

  public static void getAST(Boolean anonymous) throws IOException {
    String sourceCode = "public class Test { }";
    SourceFile sourceFile = SourceFile.builder().setBody(sourceCode).build();
    ParserEngine engine;
    if (anonymous) {
      engine = ParserEngine.get(ParserEngine.Type.ANONYMOUS);
    } else {
      engine = ParserEngine.get(ParserEngine.Type.NAMED);
    }
    Locations.useIndexFactory(); // without this, comments won't be retained correctly
    ParserOutput output = engine.parse(
      sourceFile,
      ParserEngine.HiddenTokenBehavior.COLLECT_COMMENTS
    );
  }

  public static void main(String[] args) throws IOException {
    getAST(false);
  }
}
