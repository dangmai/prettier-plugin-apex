public class VariableDeclaration {
  public void declareVariables() {
    String firstString, secondString;
    String a = 'aaa', b = 'bbb';
    List<UnknownClass.InnerClass> nestedList = new List<UnknownClass.InnerClass>();
    String veryLongVariableNameThatByItselfIsAlreadyABitTooMuch = 'tada',
      anotherVeryLongVariableNameThatByItselfIsAlreadyABitTooMuch = 'a';
    String c = 'c';
    String d = 'd';
    String e = c, d = a;
    HttpRequest request = new HttpRequest();
    String[] stringArray = new String[]{};
    String[] anotherStringArray = new String[]{'a', 'b'};
    List<String> anotherArray = new String[1];
    String[] emptyStrings;
    String[] otherStrings = new List<String>();
    List<List<String>> listOfList = new List<List<String>>();
  }
}
