package net.dangmai.serializer;

import static org.teavm.metaprogramming.Metaprogramming.exit;
import static org.teavm.metaprogramming.Metaprogramming.proxy;
import static org.teavm.metaprogramming.Metaprogramming.unsupportedCase;

import org.teavm.metaprogramming.CompileTime;
import org.teavm.metaprogramming.Meta;
import org.teavm.metaprogramming.ReflectClass;
import org.teavm.metaprogramming.Value;
import org.teavm.metaprogramming.reflect.ReflectField;
import org.teavm.metaprogramming.reflect.ReflectMethod;

@CompileTime
public class TeaMeta {

  public static Object getProxy(Object obj) {
    return getProxyImpl(obj.getClass(), obj);
  }

  @Meta
  private static native Object getProxyImpl(Class<?> cls, Object obj);

  private static void getProxyImpl(
    ReflectClass<Object> cls,
    Value<Object> obj
  ) {
    if (cls.getName().indexOf("apex") != 0) {
      unsupportedCase();
      return;
    }
    Value<Object> proxy = proxy(cls, (instance, method, args) -> {
      String name = method.getName();
      exit(() -> name);
    });
    exit(() -> proxy.get());
  }

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
    var fields = cls.getDeclaredFields();
    for (ReflectField field : fields) {
      System.out.println(field.getName());
    }
    var methods = cls.getDeclaredMethods();
    for (ReflectMethod method : methods) {
      System.out.println(method.getName());
    }
    System.out.println(className);
    exit(() -> className);
  }
}
