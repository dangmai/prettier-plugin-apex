class Ternary {
  void ternaryWithMethodCall() {
    veryLongVariableNameThatWillSurelyBreak == 'Yes'
      ? VeryLongClassNameThatWillForSureBeTooLongForThisMethodToNotBreak.someMethod()
      : VeryLongClassNameThatWillForSureBeTooLongForThisMethodToNotBreak.anotherMethod();
    longFunctionCallThatShouldBreakTheStatement(
      veryLongVariableNameThatWillSurelyBreak == 'Yes'
        ? VeryLongClassNameThatWillForSureBeTooLongForThisMethodToNotBreak.someMethod()
        : VeryLongClassNameThatWillForSureBeTooLongForThisMethodToNotBreak.anotherMethod()
    );
    veryLongVariableNameThatWillSurelyBreak == 'Yes'
      ? VeryLongClassNameThatWillForSureBeTooLongForThisMethodToNotBreak.someMethod()
          ? VeryLongClassNameThatWillForSureBeTooLongForThisMethodToNotBreak.anotherMethod()
          : yetAnotherVeryLongVariableNameThatWillSurelyBreak == 'Yes'
              ? VeryLongClassNameThatWillForSureBeTooLongForThisMethodToNotBreak.yetAnotherMethod()
              : VeryLongClassNameThatWillForSureBeTooLongForThisMethodToNotBreak.finalAnotherMethod()
      : anotherVeryLongVariableNameThatWillSurelyBreak == 'Yes'
          ? VeryLongClassNameThatWillForSureBeTooLongForThisMethodToNotBreak.anotherMethod()
          : yetAnotherVeryLongVariableNameThatWillSurelyBreak == 'Yes'
              ? VeryLongClassNameThatWillForSureBeTooLongForThisMethodToNotBreak.yetAnotherMethod()
              : VeryLongClassNameThatWillForSureBeTooLongForThisMethodToNotBreak.finalAnotherMethod();

    veryLongVariableNameThatWillSurelyBreak == 'Yes'
      ? VeryLongClassNameThatWillForSureBeTooLongForThisMethodToNotBreak.someMethod(
          variableOne,
          variableTwo,
          variableThree,
          variableFour
        )
      : VeryLongClassNameThatWillForSureBeTooLongForThisMethodToNotBreak.anotherMethod(
          variableOne,
          variableTwo,
          variableThree,
          variableFour
        );

    List<String> a = (veryLongVariableNameThatWillSurelyBreak == 'Yes'
      ? new List<String>{
          'First One',
          'Second One',
          'Third One',
          'Fourth One',
          'Fifth One'
        }
      : new List<String>{
          'First One',
          'Second One',
          'Third One',
          'Fourth One',
          'Fifth One',
          'Sixth One'
        });
  }

  void ternaryWithSoql() {
    List<Account> accounts = true
      ? [
          SELECT Id
          FROM Account
          WHERE
            Name = 'a name'
            OR Name = 'another name'
            OR Name = 'one more name'
        ]
      : [
          SELECT Id
          FROM Account
          WHERE
            Name = 'a name'
            OR Name = 'another name'
            OR Name = 'one more name'
        ];
  }
}
