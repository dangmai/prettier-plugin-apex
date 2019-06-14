class topLevelClass {
  @AuraEnabled
  public String someProperty {
    get;
    set;
  }

  @SuppressWarnings('PMD.ApexCRUDViolation')
  void someMethod(){}

  @SuppressWarnings('PMD.ApexCRUDViolation, PMD.AnotherViolation')
  void anotherMethod(){}
}
