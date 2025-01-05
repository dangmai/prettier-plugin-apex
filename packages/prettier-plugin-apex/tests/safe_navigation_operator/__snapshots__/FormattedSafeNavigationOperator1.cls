class SafeNavigationOperator {
  void simpleOperator() {
    String b = a?.b;
    String c = a[x]?.aMethod().aField;
    c = veryLongVariableThatWillHelpBreakTheExpression[insideFieldThatIsLong]
      ?.aVeryLongMethod()
      .anotherVeryLongField;
    String d = a[x].aMethod()?.aField;
    d = veryLongVariableThatWillHelpBreakTheExpression[insideFieldThatIsLong]
      .aVeryLongMethod()
      ?.anotherVeryLongField;
    d = (a[x].aMethod())?.aField;
    Integer e = anObject?.anIntegerField;
    String f = [SELECT Name FROM Account WHERE Id = :accId]?.Name;
    String g = [
      SELECT Id, Name, One_Field__c, Another_Field__c
      FROM Account
      WHERE Id = :accId
    ]?.Name;
  }
}
