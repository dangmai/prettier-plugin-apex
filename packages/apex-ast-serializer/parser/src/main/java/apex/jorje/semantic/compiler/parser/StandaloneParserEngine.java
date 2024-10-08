package apex.jorje.semantic.compiler.parser;

import apex.jorje.data.ast.CompilationUnit;
import apex.jorje.parser.impl.ApexLexer;
import apex.jorje.parser.impl.ApexParser;
import apex.jorje.parser.impl.CaseInsensitiveReaderStream;
import apex.jorje.parser.impl.HiddenTokenDecorator;
import apex.jorje.parser.impl.TokenSourceDecorator;
import apex.jorje.semantic.compiler.SourceFile;
import apex.jorje.semantic.exception.UnexpectedCodePathException;
import org.antlr.runtime.CharStream;
import org.antlr.runtime.CommonTokenStream;
import org.antlr.runtime.TokenSource;
import org.antlr.runtime.TokenStream;

public class StandaloneParserEngine {

  private final ParserWorker worker;
  private static final StandaloneParserEngine ANONYMOUS =
    new StandaloneParserEngine(AnonymousParser.get());
  private static final StandaloneParserEngine NAMED =
    new StandaloneParserEngine(NamedParser.get());

  public enum Type {
    ANONYMOUS,
    NAMED,
  }

  private StandaloneParserEngine(ParserWorker worker) {
    this.worker = worker;
  }

  public static StandaloneParserEngine get(Type type) {
    switch (type) {
      case ANONYMOUS:
        return ANONYMOUS;
      case NAMED:
        return NAMED;
      default:
        throw new UnexpectedCodePathException();
    }
  }

  public ParserOutput parse(SourceFile source) {
    CharStream stream = CaseInsensitiveReaderStream.create(source.getBody());
    ApexLexer lexer = new ApexLexer(stream);
    TokenSourceDecorator tokenSourceDecorator = new HiddenTokenDecorator(lexer);
    TokenStream tokenStream = new CommonTokenStream(
      (TokenSource) tokenSourceDecorator
    );
    ApexParser parser = new ApexParser(tokenStream);
    parser.setVersion(source.getVersion());
    parser.setNewSoqlParserEnabled(true);
    CompilationUnit unit = this.worker.parse(parser);
    return ParserOutput.createFromAntlr(
      parser,
      lexer,
      unit,
      ((TokenSourceDecorator) tokenSourceDecorator).getHiddenTokenMap()
    );
  }
}
