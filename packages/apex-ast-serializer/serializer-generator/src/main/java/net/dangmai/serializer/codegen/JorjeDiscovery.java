package net.dangmai.serializer.codegen;

import io.github.classgraph.ClassGraph;
import io.github.classgraph.ClassInfo;
import io.github.classgraph.ScanResult;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Discovers the jorje AST classes the serializer must handle, using the same
 * class/package patterns as the {@code generateTypeScript} config in
 * {@code server/build.gradle}. Keeping the two consumers on identical patterns
 * is what guarantees the runtime JSON and the generated {@code jorje.d.ts}
 * can't drift on a jorje bump.
 *
 * <p>For now the patterns are mirrored here verbatim. M2 will extract them into
 * a shared Gradle config consumed by both this generator and
 * {@code generateTypeScript}.
 */
public final class JorjeDiscovery {

  /** Mirrors {@code generateTypeScript.classes}. */
  private static final List<String> CLASSES = List.of(
    "apex.jorje.semantic.compiler.parser.ParserOutput"
  );

  /** Mirrors {@code generateTypeScript.classPatterns}. */
  private static final List<String> CLASS_PATTERNS = List.of(
    "apex.jorje.data.**",
    "apex.jorje.parser.impl.HiddenToken**"
  );

  /** Mirrors {@code generateTypeScript.excludeClassPatterns}. */
  private static final List<String> EXCLUDE_CLASS_PATTERNS = List.of(
    "apex.jorje.**$MatchBlock",
    "apex.jorje.**$MatchBlockWithDefault",
    "apex.jorje.**$SwitchBlock",
    "apex.jorje.**$SwitchBlockWithDefault",
    "apex.jorje.**$Visitor",
    "apex.jorje.**Factory",
    "apex.jorje.**Decorator"
  );

  // The widest package that contains everything the patterns above can match.
  // ClassGraph scans bytecode here; the patterns then narrow the result set.
  private static final String SCAN_PACKAGE = "apex.jorje";

  private final List<Pattern> acceptPatterns;
  private final List<Pattern> excludePatterns;

  public JorjeDiscovery() {
    this.acceptPatterns = CLASS_PATTERNS.stream().map(JorjeDiscovery::globToRegex).toList();
    this.excludePatterns = EXCLUDE_CLASS_PATTERNS.stream().map(JorjeDiscovery::globToRegex).toList();
  }

  /**
   * Scans jorje and returns the {@link ClassInfo} for every type that matches
   * the discovery config, sorted by fully-qualified name for stable output.
   */
  public List<ClassInfo> discover() {
    List<ClassInfo> discovered = new ArrayList<>();
    try (
      ScanResult scanResult = new ClassGraph()
        .enableClassInfo()
        .acceptPackages(SCAN_PACKAGE)
        .scan()
    ) {
      for (ClassInfo classInfo : scanResult.getAllClasses()) {
        if (matches(classInfo.getName())) {
          discovered.add(classInfo);
        }
      }
    }
    discovered.sort((a, b) -> a.getName().compareTo(b.getName()));
    return discovered;
  }

  private boolean matches(String fqn) {
    boolean accepted =
      CLASSES.contains(fqn) || acceptPatterns.stream().anyMatch(p -> p.matcher(fqn).matches());
    if (!accepted) {
      return false;
    }
    return excludePatterns.stream().noneMatch(p -> p.matcher(fqn).matches());
  }

  /**
   * Converts a typescript-generator glob to a regex with the same semantics:
   * {@code **} matches any characters, a single {@code *} matches any character
   * except the package separator {@code .}. Everything else is matched
   * literally.
   */
  static Pattern globToRegex(String glob) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < glob.length(); i++) {
      char c = glob.charAt(i);
      if (c == '*') {
        if (i + 1 < glob.length() && glob.charAt(i + 1) == '*') {
          sb.append(".*");
          i++;
        } else {
          sb.append("[^.]*");
        }
      } else if (Character.isLetterOrDigit(c) || c == '_') {
        sb.append(c);
      } else {
        // Escape regex metacharacters such as '.' and '$'.
        sb.append('\\').append(c);
      }
    }
    return Pattern.compile(sb.toString());
  }
}
