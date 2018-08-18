const prettier = require("prettier");

function format(text) {
  return prettier.format(text, {
    parser: "apex",
    plugins: ["."],
    tabWidth: 2,
  });
}
test("Annotated class", () => {
  expect(format("@IsTest class TestClass \n {}")).toBe(`@IsTest
class TestClass {
}
`);
});
test("Annotated class with true param", () => {
  expect(format("@IsTest(SeeAllData=true) class TestClass \n {}")).toBe(`@IsTest(SeeAllData=true)
class TestClass {
}
`);
});
test("Annotated class with false param", () => {
  expect(format("@IsTest(SeeAllData=false) class TestClass \n {}")).toBe(`@IsTest(SeeAllData=false)
class TestClass {
}
`);
});
test("public class", () => {
  expect(format("public      class TestClass \n {}")).toBe("public class TestClass {\n}\n");
});
test("private class", () => {
  expect(format("private      class TestClass \n {}")).toBe("private class TestClass {\n}\n");
});
test("global class", () => {
  expect(format("global      class TestClass \n {}")).toBe("global class TestClass {\n}\n");
});
test("without sharing class without modifier", () => {
  expect(format("without  sharing      class TestClass \n {}")).toBe("without sharing class TestClass {\n}\n");
});
test("without sharing public class", () => {
  expect(format("without  sharing   public   class TestClass \n {}")).toBe("without sharing public class TestClass {\n}\n");
});
test("virtual with sharing public class", () => {
  expect(format("virtual   with  sharing   public   class TestClass \n {}")).toBe("virtual with sharing public class TestClass {\n}\n");
});
test("abstract with sharing public class", () => {
  expect(format("abstract   with  sharing   public   class TestClass \n {}")).toBe("abstract with sharing public class TestClass {\n}\n");
});
test("with sharing class without modifier", () => {
  expect(format("with  sharing      class TestClass \n {}")).toBe("with sharing class TestClass {\n}\n");
});
test("with sharing public class", () => {
  expect(format("with  sharing   public   class TestClass \n {}")).toBe("with sharing public class TestClass {\n}\n");
});
test("class without modifier", () => {
  expect(format("      class TestClass \n {}")).toBe("class TestClass {\n}\n");
});
test("nested class", () => {
  expect(format(`
class OuterClass   {
  class InnerClass
  {  }
}`)).toBe(`
class OuterClass {
  class InnerClass {}
}
`);
});
test("extending class", () => {
  expect(format("class TestClass extends ParentClass \n {}")).toBe("class TestClass extends ParentClass {\n}\n");
});
test("implement 1 interface", () => {
  expect(format("class TestClass implements FirstInterface \n {}")).toBe("class TestClass implements FirstInterface {\n}\n");
});
test("implement multiple interfaces", () => {
  expect(format("class TestClass implements FirstInterface, SecondInterface \n {}")).toBe("class TestClass implements FirstInterface, SecondInterface {\n}\n");
});
test("one param method", () => {
  expect(format(`
class TestClass   {
  public String hello(String subject)
  { return "Hello"    + subject; }
}`)).toBe(`
class TestClass {
  public String hello(String subject) {
    return "Hello" + subject;
  }
}
`);
});
test("multiple params method", () => {
  expect(format(`
class TestClass   {
  public String hello(String action, String subject)
  { return action    + subject; }
}`)).toBe(`
class TestClass {
  public String hello(String action, String subject) {
    return action + subject;
  }
}
`);
});
