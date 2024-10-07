package net.dangmai.serializer;

import apex.jorje.data.Locations;
import apex.jorje.semantic.compiler.SourceFile;
import apex.jorje.semantic.compiler.parser.ParserOutput;
import apex.jorje.semantic.compiler.parser.StandaloneParserEngine;
import java.io.IOException;
import org.teavm.jso.JSBody;

public class DirectApex {

  @JSBody(
    params = { "message" },
    script = "console.log(JSON.stringify(message))"
  )
  public static native void stringify(String message);

  public static void getAST(String sourceCode, Boolean anonymous)
    throws IOException {
    DirectApex.stringify("1");
    SourceFile sourceFile = SourceFile.builder().setBody(sourceCode).build();
    DirectApex.stringify("2");
    StandaloneParserEngine engine;
    if (anonymous) {
      engine = StandaloneParserEngine.get(
        StandaloneParserEngine.Type.ANONYMOUS
      );
    } else {
      engine = StandaloneParserEngine.get(StandaloneParserEngine.Type.NAMED);
    }
    Locations.useIndexFactory(); // without this, comments won't be retained correctly
    // DirectApex.stringify(engine.parse(sourceFile));
    // DirectApex.stringify("Hello here");
    ParserOutput output = engine.parse(sourceFile);
    DirectApex.stringify(output.getUnit().toString());
  }

  public static void main(String[] args) throws IOException {
    String sourceCode = "public class Test { static void main() {} }";
    getAST(sourceCode, false);
  }
}
