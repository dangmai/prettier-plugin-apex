package net.dangmai.serializer;

import io.github.classgraph.ClassGraph;
import io.github.classgraph.ScanResult;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import javassist.CannotCompileException;
import javassist.ClassPool;
import javassist.CtClass;
import javassist.CtField;
import javassist.CtMethod;
import javassist.CtNewMethod;
import javassist.Modifier;
import javassist.NotFoundException;
import javassist.bytecode.AnnotationsAttribute;
import javassist.bytecode.ConstPool;
import javassist.bytecode.annotation.Annotation;
import javassist.bytecode.annotation.StringMemberValue;
import javassist.expr.ExprEditor;
import javassist.expr.FieldAccess;

public class Annotations {

  private static AnnotationsAttribute getMethodAnnotationsAttribute(
    ConstPool constPool
  ) {
    AnnotationsAttribute attr = new AnnotationsAttribute(
      constPool,
      AnnotationsAttribute.visibleTag
    );
    Annotation jsExportAnnotation = new Annotation(
      "org.teavm.jso.JSExport",
      constPool
    );
    Annotation jsPropertyAnnotation = new Annotation(
      "org.teavm.jso.JSProperty",
      constPool
    );
    attr.addAnnotation(jsExportAnnotation);
    attr.addAnnotation(jsPropertyAnnotation);
    return attr;
  }

  private static AnnotationsAttribute getClassAnnotationsAttribute(
    ConstPool constPool
  ) {
    AnnotationsAttribute attr = new AnnotationsAttribute(
      constPool,
      AnnotationsAttribute.visibleTag
    );
    String fullClassName = constPool.getClassName();
    String simpleName = fullClassName.substring(
      fullClassName.lastIndexOf('.') + 1
    );
    if (simpleName.contains("$")) {
      String parentClassName = simpleName.substring(0, simpleName.indexOf('$'));
      String ownName = simpleName.substring(simpleName.indexOf('$') + 1);
      simpleName = parentClassName + ownName;
    }
    Annotation classNameAnnotation = new Annotation(
      "org.teavm.jso.JSClass",
      constPool
    );
    classNameAnnotation.addMemberValue(
      "name",
      new StringMemberValue(simpleName, constPool)
    );
    attr.addAnnotation(classNameAnnotation);
    return attr;
  }

  private static String[] getClassNamesContainsPattern(String pattern) {
    List<String> foundTypes;
    try (ScanResult scanResult = new ClassGraph().enableClassInfo().scan()) {
      foundTypes = scanResult
        .getAllClasses()
        .getNames()
        .stream()
        .filter(e -> e.contains(pattern))
        .collect(Collectors.toList());
    }

    return foundTypes.toArray(new String[foundTypes.size()]);
  }

  private static void annotateJorjeClasses(ClassPool pool, String generatedDir)
    throws Exception {
    String[] classes = getClassNamesContainsPattern("apex");
    CtClass[] ctClasses = pool.get(classes);
    for (CtClass ctClass : ctClasses) {
      System.out.println("Patching " + ctClass.getName());

      if (
        ctClass
          .getName()
          .equals("apex.jorje.services.datetimes.DateTimeFormats")
      ) {
        // We need to patch the way the formatter works in this class, because
        // it relies on different behavior of the JDK vs the threeten library
        // that TeaVM uses.

        var staticConstructor = ctClass.getClassInitializer();
        staticConstructor.instrument(
          new ExprEditor() {
            public void edit(FieldAccess f) throws CannotCompileException {
              System.out.println(
                "Field access: " + f.getFieldName() + " " + f.isWriter()
              );
              if (f.getFieldName().equals("TIME_OFFSET") && f.isWriter()) {
                f.replace(
                  "TIME_OFFSET = (new java.time.format.DateTimeFormatterBuilder()).appendOptional(new java.time.format.DateTimeFormatterBuilder().appendOffset(\"+HH:MM\", \"Z\").toFormatter())" +
                  ".appendOptional(new java.time.format.DateTimeFormatterBuilder().appendOffset(\"+HHMM\", \"Z\").toFormatter()).toFormatter();"
                );
              }
            }
          }
        );
      }

      AnnotationsAttribute classAnnotationAttribute =
        getClassAnnotationsAttribute(ctClass.getClassFile().getConstPool());
      ctClass.getClassFile().addAttribute(classAnnotationAttribute);

      CtField[] ctFields = ctClass.getDeclaredFields();
      for (CtField ctField : ctFields) {
        if (Modifier.isStatic(ctField.getModifiers())) {
          // We don't want to expose static fields to JS
          continue;
        }
        System.out.println(
          "Checking field " + ctField.getName() + " in " + ctClass.getName()
        );
        String methodName =
          "get" +
          ctField.getName().substring(0, 1).toUpperCase() +
          ctField.getName().substring(1);

        CtMethod getter = CtNewMethod.make(
          "public " +
          ctField.getType().getName() +
          " " +
          methodName +
          "() { return this." +
          ctField.getName() +
          "; }",
          ctClass
        );
        Boolean addMethod = true;
        try {
          getter = ctClass.getDeclaredMethod(methodName);
          System.out.println(
            "Method " + methodName + " already exists in " + ctClass.getName()
          );
          addMethod = false;
        } catch (NotFoundException e) {
          // Method does not exist, we can add it
        }

        AnnotationsAttribute attr = getMethodAnnotationsAttribute(
          ctClass.getClassFile().getConstPool()
        );
        getter.getMethodInfo().addAttribute(attr);
        if (addMethod) {
          ctClass.addMethod(getter);
        }
      }
      ctClass.writeFile(generatedDir);
    }
  }

  private static void annotateTeaVmClasses(ClassPool pool, String generatedDir)
    throws Exception {
    // CtClass ctClass = pool.get("org.teavm.classlib.java.util.TArrayList");
    Map<String, Supplier<String[]>> getters = Map.of(
      "org.teavm.classlib.java.util.TArrayList",
      () ->
        new String[] {
          "public Object[] getData() { this.trimToSize(); return this.array; }",
        },
      "org.teavm.classlib.java.util.TOptional",
      () ->
        new String[] {
          "public Object getData() { if (this.isPresent()) { return this.value; } else { return null; } }",
        }
    );
    for (String className : getters.keySet()) {
      CtClass ctClass = pool.get(className);
      for (String getter : getters.get(className).get()) {
        CtMethod method = CtNewMethod.make(getter, ctClass);
        AnnotationsAttribute attr = getMethodAnnotationsAttribute(
          ctClass.getClassFile().getConstPool()
        );
        method.getMethodInfo().addAttribute(attr);
        ctClass.addMethod(method);
      }
      ctClass.writeFile(generatedDir);
    }
  }

  public static void main(String[] args) throws Exception {
    String generatedDir = args[0];
    ClassPool pool = ClassPool.getDefault();
    // TeaVM requires that properties that are exposed to JS are annotated
    // with annotations. Since we don't have access to jorje source code,
    // we need to add these annotations by manipulating the bytecode.
    annotateJorjeClasses(pool, generatedDir);
    // TeaVM classlib also doesn't have these annotations by default, so
    // we need to add them as well.
    annotateTeaVmClasses(pool, generatedDir);
  }
}
