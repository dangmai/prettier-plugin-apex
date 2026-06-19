package net.dangmai.serializer.codegen;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.math.BigDecimal;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * The serialization model for one concrete jorje type: its class name plus the
 * fields to emit and how to read each one (a public field, or a getter cast to a
 * public supertype when the field/class isn't accessible).
 *
 * <p>XStream serialized every non-static, non-transient field — including
 * inherited and private ones — via reflection. We reproduce that field set, but
 * read each field through a compile-time-accessible path so the generated code
 * needs no runtime reflection.
 */
final class TypeModel {

  /** How a scalar field is written inline (no {@code @class} wrapper). */
  enum InlineKind {
    STRING,
    LONG,
    DOUBLE,
    BOOLEAN,
    CHAR,
    BIG_DECIMAL,
  }

  /** One field to serialize. */
  static final class FieldModel {

    final String jsonName;
    /** A public type to cast {@code o} to before reading. */
    final String castType;
    /** Read suffix appended after the cast, e.g. {@code .loc} or {@code .getLoc()}. */
    final String accessSuffix;
    /** Non-null for inline scalars; null means "dispatch on runtime type". */
    final InlineKind inlineKind;

    FieldModel(String jsonName, String castType, String accessSuffix, InlineKind inlineKind) {
      this.jsonName = jsonName;
      this.castType = castType;
      this.accessSuffix = accessSuffix;
      this.inlineKind = inlineKind;
    }
  }

  final String className;
  final List<FieldModel> fields;

  private TypeModel(String className, List<FieldModel> fields) {
    this.className = className;
    this.fields = fields;
  }

  // Field name -> getter method name, for the few jorje fields whose getter
  // doesn't follow the get<Field> convention (the field is read by XStream
  // reflectively, but we need an accessible getter).
  private static final Map<String, String> GETTER_OVERRIDES = Map.of(
    "apex.jorje.data.ast.ParameterRefs$ModifierParameterRef#typeRef", "getType",
    "apex.jorje.data.ast.ParameterRefs$EmptyModifierParameterRef#typeRef", "getType"
  );

  private static final Set<String> INLINE_WRAPPERS = Set.of(
    "java.lang.String",
    "java.lang.Integer",
    "java.lang.Long",
    "java.lang.Short",
    "java.lang.Byte",
    "java.lang.Boolean",
    "java.lang.Double",
    "java.lang.Float",
    "java.lang.Character",
    "java.math.BigDecimal"
  );

  /**
   * Builds the model for a concrete type, or returns {@code null} if any field
   * can't be read accessibly (e.g. builder classes with private fields and no
   * getters — these never appear in a real parsed AST).
   */
  static TypeModel build(Class<?> clazz) {
    List<FieldModel> fields = new ArrayList<>();
    for (Field f : instanceFields(clazz)) {
      FieldModel fm = buildField(clazz, f);
      if (fm == null) {
        return null;
      }
      fields.add(fm);
    }
    return new TypeModel(clazz.getName(), fields);
  }

  private static FieldModel buildField(Class<?> clazz, Field f) {
    InlineKind kind = inlineKind(f.getType());
    boolean fieldAccessible =
      Modifier.isPublic(f.getModifiers())
        && Modifier.isPublic(f.getDeclaringClass().getModifiers());
    if (fieldAccessible) {
      // The cast target must be a source-referenceable type (canonical, dotted).
      // Anonymous/local declaring classes have no canonical name -> unresolvable.
      String castType = f.getDeclaringClass().getCanonicalName();
      if (castType == null) {
        return null;
      }
      return new FieldModel(f.getName(), castType, "." + f.getName(), kind);
    }
    // Fall back to an accessible getter cast to a public declaring type.
    Method getter = findGetter(clazz, f);
    if (getter == null) {
      return null;
    }
    Class<?> publicOwner = publicDeclaringType(clazz, getter.getName());
    if (publicOwner == null || publicOwner.getCanonicalName() == null) {
      return null;
    }
    return new FieldModel(
      f.getName(), publicOwner.getCanonicalName(), "." + getter.getName() + "()", kind
    );
  }

  private static InlineKind inlineKind(Class<?> type) {
    if (type == String.class) {
      return InlineKind.STRING;
    }
    if (type == BigDecimal.class) {
      return InlineKind.BIG_DECIMAL;
    }
    if (type == boolean.class || type == Boolean.class) {
      return InlineKind.BOOLEAN;
    }
    if (type == char.class || type == Character.class) {
      return InlineKind.CHAR;
    }
    if (type == double.class || type == float.class
      || type == Double.class || type == Float.class) {
      return InlineKind.DOUBLE;
    }
    if (type == int.class || type == long.class || type == short.class || type == byte.class
      || type == Integer.class || type == Long.class || type == Short.class || type == Byte.class) {
      return InlineKind.LONG;
    }
    // Object, enums, interfaces, collections, optionals, jorje objects, etc.
    return null;
  }

  private static List<Field> instanceFields(Class<?> clazz) {
    List<Field> fields = new ArrayList<>();
    for (Class<?> c = clazz; c != null && c != Object.class; c = c.getSuperclass()) {
      for (Field f : c.getDeclaredFields()) {
        int m = f.getModifiers();
        if (Modifier.isStatic(m) || Modifier.isTransient(m) || f.isSynthetic()) {
          continue;
        }
        fields.add(f);
      }
    }
    return fields;
  }

  private static Method findGetter(Class<?> clazz, Field f) {
    String override = GETTER_OVERRIDES.get(clazz.getName() + "#" + f.getName());
    String cap = Character.toUpperCase(f.getName().charAt(0)) + f.getName().substring(1);
    String[] candidates =
      override != null ? new String[] {override} : new String[] {"get" + cap, "is" + cap};
    for (String name : candidates) {
      try {
        Method m = clazz.getMethod(name);
        if (m.getParameterCount() == 0) {
          return m;
        }
      } catch (NoSuchMethodException ignored) {
        // try next candidate
      }
    }
    return null;
  }

  /** Finds a public class/interface (searched transitively) that declares the getter. */
  private static Class<?> publicDeclaringType(Class<?> clazz, String getterName) {
    Set<Class<?>> seen = new LinkedHashSet<>();
    Deque<Class<?>> queue = new ArrayDeque<>();
    queue.add(clazz);
    while (!queue.isEmpty()) {
      Class<?> c = queue.poll();
      if (c == null || !seen.add(c)) {
        continue;
      }
      if (Modifier.isPublic(c.getModifiers()) && declaresMethod(c, getterName)) {
        return c;
      }
      if (c.getSuperclass() != null) {
        queue.add(c.getSuperclass());
      }
      for (Class<?> itf : c.getInterfaces()) {
        queue.add(itf);
      }
    }
    return null;
  }

  private static boolean declaresMethod(Class<?> c, String name) {
    try {
      c.getDeclaredMethod(name);
      return true;
    } catch (NoSuchMethodException e) {
      return false;
    }
  }
}
