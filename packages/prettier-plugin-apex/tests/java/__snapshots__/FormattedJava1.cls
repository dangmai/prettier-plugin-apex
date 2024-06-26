public class Java {
  public void testJavaVariable() {
    Integer i = java:java.lang.Integer.MAX_VALUE;
    List<Integer> l = java:java.util.Collections.EMPTY_LIST;
  }

  public void testJavaMethod() {
    Integer i = java:java.lang.Integer.valueOf(1729);
    List<Integer> l = java:java.util.Collections.emptyList();
    java:java.util.List propList = new java:java.util.ArrayList();
    java:java.util.Collections.copy(propList, propList);
    java:java.util.Collections.copy(
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    );
  }

  // Test that we properly convert types for java constructors
  public void testNewObject() {
    new java:java.lang.Double(0);
    new java:java.lang.Double(0L);
    new java:java.lang.Double(0.0d);
  }
}
