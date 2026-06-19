package net.dangmai.serializer.codegen;

import io.github.classgraph.ClassInfo;
import java.util.List;

/**
 * Build-time entry point for the reflection-free AST serializer generator.
 *
 * <p>M1 scope: prove the scaffold by discovering the jorje AST classes via
 * {@link JorjeDiscovery} and printing a count breakdown. Emitting the generated
 * serializer source comes in a later milestone.
 */
public final class SerializerGenerator {

  private SerializerGenerator() {}

  public static void main(String[] args) {
    List<ClassInfo> discovered = new JorjeDiscovery().discover();

    long interfaces = discovered.stream().filter(ClassInfo::isInterface).count();
    long enums = discovered.stream().filter(ClassInfo::isEnum).count();
    long abstractClasses = discovered.stream()
      .filter(ci -> ci.isStandardClass() && !ci.isEnum() && ci.isAbstract())
      .count();
    long concreteClasses = discovered.stream()
      .filter(ci -> ci.isStandardClass() && !ci.isEnum() && !ci.isAbstract())
      .count();

    System.out.println("Discovered " + discovered.size() + " jorje types:");
    System.out.println("  concrete classes: " + concreteClasses);
    System.out.println("  enums:            " + enums);
    System.out.println("  abstract classes: " + abstractClasses);
    System.out.println("  interfaces:       " + interfaces);
  }
}
