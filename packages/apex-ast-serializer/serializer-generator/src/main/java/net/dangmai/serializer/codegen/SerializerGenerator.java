package net.dangmai.serializer.codegen;

import io.github.classgraph.ClassInfo;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Build-time entry point for the reflection-free AST serializer generator.
 *
 * <p>Discovers the concrete jorje AST types via {@link JorjeDiscovery}, builds a
 * {@link TypeModel} for each, and emits {@code GeneratedAstSerializer.java} into
 * the output directory passed as the first argument.
 */
public final class SerializerGenerator {

  private SerializerGenerator() {}

  public static void main(String[] args) {
    if (args.length < 1) {
      throw new IllegalArgumentException("Usage: SerializerGenerator <output-source-dir>");
    }
    Path outputDir = Path.of(args[0]);

    List<TypeModel> models = buildModels();
    String source = JavaEmitter.emit(models);
    writeSource(outputDir, source);

    System.out.println(
      "Generated " + JavaEmitter.CLASS_NAME + " for " + models.size() + " types -> " + outputDir
    );
  }

  private static List<TypeModel> buildModels() {
    List<ClassInfo> discovered = new JorjeDiscovery().discover();
    List<TypeModel> models = new ArrayList<>();
    List<String> skipped = new ArrayList<>();
    for (ClassInfo ci : discovered) {
      // Only concrete classes get a field writer. Enums (including enum-constant
      // subclasses) are handled by writeValue's runtime dispatch, not here.
      if (!ci.isStandardClass() || ci.isAbstract() || ci.isInterface()) {
        continue;
      }
      Class<?> clazz = load(ci.getName());
      if (Enum.class.isAssignableFrom(clazz)) {
        continue;
      }
      TypeModel model = TypeModel.build(clazz);
      if (model == null) {
        // A field with no accessible read path — e.g. *Builder classes, which
        // never appear in a real parsed AST. Left out of the dispatcher; if one
        // ever shows up at runtime, writeFields throws loudly.
        skipped.add(ci.getName());
        continue;
      }
      models.add(model);
    }
    if (!skipped.isEmpty()) {
      System.out.println("Skipped " + skipped.size() + " types with no accessible fields: " + skipped);
    }
    return models;
  }

  private static Class<?> load(String name) {
    try {
      return Class.forName(name, false, SerializerGenerator.class.getClassLoader());
    } catch (ClassNotFoundException e) {
      throw new IllegalStateException("Discovered class not loadable: " + name, e);
    }
  }

  private static void writeSource(Path outputDir, String source) {
    Path packageDir = outputDir.resolve(JavaEmitter.PACKAGE.replace('.', '/'));
    Path file = packageDir.resolve(JavaEmitter.CLASS_NAME + ".java");
    try {
      Files.createDirectories(packageDir);
      Files.writeString(file, source);
    } catch (IOException e) {
      throw new UncheckedIOException("Failed to write " + file, e);
    }
  }
}
