package net.dangmai.serializer;

import io.github.classgraph.ClassGraph;
import io.github.classgraph.ScanResult;
import java.util.List;
import java.util.stream.Collectors;
import javassist.ClassPool;
import javassist.CtClass;
import javassist.CtField;
import javassist.CtMethod;
import javassist.CtNewMethod;
import javassist.NotFoundException;
import javassist.bytecode.AnnotationsAttribute;
import javassist.bytecode.ConstPool;
import javassist.bytecode.annotation.Annotation;
import javassist.bytecode.annotation.StringMemberValue;

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
    System.out.println(simpleName);
    if (simpleName.contains("$")) {
      String parentClassName = simpleName.substring(0, simpleName.indexOf('$'));
      String ownName = simpleName.substring(simpleName.indexOf('$') + 1);
      System.out.println(parentClassName);
      simpleName = parentClassName + ownName;
    }
    Annotation classNameAnnotation = new Annotation(
      "org.teavm.jso.JSClass",
      constPool
    );
    System.out.println(fullClassName);
    System.out.println(simpleName);
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

  public static void main(String[] args) throws Exception {
    ClassPool pool = ClassPool.getDefault();
    String[] classes = getClassNamesContainsPattern("apex");
    System.out.println(classes.length);
    CtClass[] ctClasses = pool.get(classes);
    for (CtClass ctClass : ctClasses) {
      System.out.println("Patching " + ctClass.getName());

      AnnotationsAttribute classAnnotationAttribute =
        getClassAnnotationsAttribute(ctClass.getClassFile().getConstPool());
      ctClass.getClassFile().addAttribute(classAnnotationAttribute);

      CtField[] ctFields = ctClass.getDeclaredFields();
      for (CtField ctField : ctFields) {
        if (ctField.getName().equals("serialVersionUID")) {
          // There's something weird with this field when try to generate
          // JS for it, so we skip it
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
      ctClass.writeFile("generated");
    }
  }
}
