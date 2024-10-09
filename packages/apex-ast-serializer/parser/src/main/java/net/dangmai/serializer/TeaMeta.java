package net.dangmai.serializer;

import static org.teavm.metaprogramming.Metaprogramming.exit;
import static org.teavm.metaprogramming.Metaprogramming.unsupportedCase;

import org.teavm.metaprogramming.CompileTime;
import org.teavm.metaprogramming.Meta;
import org.teavm.metaprogramming.ReflectClass;
import org.teavm.metaprogramming.Value;

@CompileTime
public class TeaMeta {

  public static Object getClassName(Object obj) {
    return getClassNameImpl(obj.getClass(), obj);
  }

  @Meta
  private static native Object getClassNameImpl(Class<?> cls, Object obj);

  private static void getClassNameImpl(
    ReflectClass<Object> cls,
    Value<Object> obj
  ) {
    if (cls.getName().indexOf("apex") != 0) {
      unsupportedCase();
      return;
    }
    var className = cls.getName();
    System.out.println(className);
    exit(() -> className);
  }
}
