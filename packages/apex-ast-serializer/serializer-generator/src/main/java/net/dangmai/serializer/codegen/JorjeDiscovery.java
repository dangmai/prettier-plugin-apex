package net.dangmai.serializer.codegen;

import io.github.classgraph.ClassGraph;
import io.github.classgraph.ClassInfo;
import io.github.classgraph.ScanResult;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.regex.Pattern;

/**
 * Discovers the jorje AST classes the serializer must handle.
 *
 * <p>The class/package patterns are loaded from {@code jorje-discovery.properties},
 * a resource generated at build time from the shared
 * {@code ../jorje-discovery.gradle}. That same Gradle file drives the
 * {@code generateTypeScript} config in {@code server/build.gradle}, so the runtime
 * JSON and the generated {@code jorje.d.ts} can't drift on a jorje bump.
 */
public final class JorjeDiscovery {

  private static final String CONFIG_RESOURCE = "/jorje-discovery.properties";

  // The widest package that contains everything the patterns can match.
  // ClassGraph scans bytecode here; the patterns then narrow the result set.
  private static final String SCAN_PACKAGE = "apex.jorje";

  private final List<String> classes;
  private final List<Pattern> acceptPatterns;
  private final List<Pattern> excludePatterns;

  public JorjeDiscovery() {
    Properties config = loadConfig();
    this.classes = splitList(config.getProperty("classes"));
    this.acceptPatterns =
      splitList(config.getProperty("classPatterns")).stream().map(JorjeDiscovery::globToRegex).toList();
    this.excludePatterns =
      splitList(config.getProperty("excludeClassPatterns")).stream()
        .map(JorjeDiscovery::globToRegex)
        .toList();
  }

  private static Properties loadConfig() {
    try (InputStream in = JorjeDiscovery.class.getResourceAsStream(CONFIG_RESOURCE)) {
      if (in == null) {
        throw new IllegalStateException(
          "Missing " + CONFIG_RESOURCE + " — run the generateDiscoveryConfig Gradle task"
        );
      }
      Properties props = new Properties();
      props.load(in);
      return props;
    } catch (IOException e) {
      throw new UncheckedIOException("Failed to read " + CONFIG_RESOURCE, e);
    }
  }

  private static List<String> splitList(String value) {
    if (value == null || value.isBlank()) {
      return List.of();
    }
    return List.of(value.split(","));
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
        // jorje serializes package-private types too (e.g. apex.jorje.data.IndexLocation),
        // and typescript-generator includes them — match that, or the dispatcher would
        // throw on them at runtime.
        .ignoreClassVisibility()
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
      classes.contains(fqn) || acceptPatterns.stream().anyMatch(p -> p.matcher(fqn).matches());
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
