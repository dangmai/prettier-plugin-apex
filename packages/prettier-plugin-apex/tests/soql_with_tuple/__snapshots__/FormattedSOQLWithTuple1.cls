class SOQLWithTuple {
  void keyValueTypes() {
    Account[] numberValue = [SELECT Id FROM Account WITH Foo(bar = 1)];
    Account[] stringValue = [SELECT Id FROM Account WITH Foo(bar = 'baz')];
    Account[] booleanValue = [SELECT Id FROM Account WITH Foo(bar = true)];
  }

  void multipleKeyValues() {
    Account[] mixed = [
      SELECT Id
      FROM Account
      WITH Foo(bar = 1, baz = 'qux', flag = true)
    ];
  }

  void caseAndSpacing() {
    Account[] lower = [SELECT Id FROM Account WITH Foo(bar = 1)];
    Account[] extraSpaces = [SELECT Id FROM Account WITH Foo(bar = 1)];
  }

  void withOtherClauses() {
    Account[] whereAndTuple = [
      SELECT Id
      FROM Account
      WHERE Name = 'Acme'
      WITH Foo(bar = 1)
    ];
    Account[] tupleThenOrder = [
      SELECT Id
      FROM Account
      WITH Foo(bar = 1)
      ORDER BY Name
      LIMIT 10
    ];
  }

  void combinedWithIdentifiers() {
    Account[] tupleThenIdentifier = [
      SELECT Id
      FROM Account
      WITH Foo(bar = 1) WITH USER_MODE
    ];
  }

  void longLineForcesWrapping() {
    Account[] longQuery = [
      SELECT Id, Name
      FROM Account
      WITH MetadataFilter(
        longKeyNameOne = 'valueOne',
        longKeyNameTwo = 'valueTwo',
        longKeyNameThree = 12345,
        longKeyNameFour = true
      )
    ];
  }

  void multilineBody() {
    Account[] verbose = [
      SELECT Id
      FROM Account
      WITH Foo(bar = 1, baz = 'qux')
    ];
  }
}
