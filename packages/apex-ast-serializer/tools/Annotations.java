import io.github.classgraph.*;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import javassist.*;
import javassist.bytecode.*;
import javassist.bytecode.annotation.Annotation;

public class Annotations {

  private static AnnotationsAttribute getAnnotationsAttribute(
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

        // if (!Modifier.isPublic(ctField.getModifiers())) {
        //   continue;
        // }
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

        AnnotationsAttribute attr = getAnnotationsAttribute(
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
