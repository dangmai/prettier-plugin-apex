public class VariableDeclaration {
  public void declareVariables() {
    String firstString, secondString;
    String a = 'aaa', b = 'bbb';
    List<UnknownClass.InnerClass> nestedList =
      new List<UnknownClass.InnerClass>();
    String veryLongVariableNameThatByItselfIsAlreadyABitTooMuch = 'tada',
      anotherVeryLongVariableNameThatByItselfIsAlreadyABitTooMuch = 'a';
    String veryLongVariableNameThatByItselfIsAlreadyABitTooMuch =
        'veryLongValueThatShouldBreak',
      anotherVeryLongVariableNameThatByItselfIsAlreadyABitTooMuch =
        'anotherVeryLongValueThatShouldBreak';
    Contact b = [
        SELECT Id
        FROM Contact
        WHERE Name = 'Super Long Name That Will Break On Its Own'
      ],
      a = [
        SELECT Id
        FROM Contact
        WHERE Name = 'Super Long Name That Will Break On Its Own'
      ];
    Boolean b = [
        SELECT Id
        FROM Contact
        WHERE Name = 'Super Long Name That Will Break On Its Own'
      ].size(),
      a = [
        SELECT Id
        FROM Contact
        WHERE Name = 'Super Long Name That Will Break On Its Own'
      ].size();
    Boolean b = [
        SELECT Id
        FROM Contact
        WHERE Name = 'Super Long Name That Will Break On Its Own'
      ]
        .size()
        .size(),
      a = [
        SELECT Id
        FROM Contact
        WHERE Name = 'Super Long Name That Will Break On Its Own'
      ]
        .size()
        .size();
    String c = 'c';
    String d = 'd';
    String e = c, d = a;
    HttpRequest request = new HttpRequest();
    String[] stringArray = new List<String>{};
    String[] anotherStringArray = new List<String>{ 'a', 'b' };
    List<String> anotherArray = new String[1];
    String[] emptyStrings;
    Integer maxNums = 5;
    stringArrays = new List<String>();
    stringArrays = new String[0];
    stringArray = new List<String>(maxNums);

    List<String> anotherArray = new List<String>(maxNums);
    List<List<String>> listOfList = new List<List<String>>();
    listOfList = new List<List<String>>(0);
    listOfList = new List<List<String>>(maxNums);
  }
}
