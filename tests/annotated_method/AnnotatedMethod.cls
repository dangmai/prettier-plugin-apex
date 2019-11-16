class topLevelClass {
  @AuraEnabled
  public String someProperty {
    get;
    set;
  }

  @AuraEnabled(cacheable=true continuation=true)
  public static Account getAccount(Id accountId) {
  }

  @SuppressWarnings('PMD.ApexCRUDViolation')
  void someMethod(){}

  @SuppressWarnings('PMD.ApexCRUDViolation, PMD.AnotherViolation')
  void anotherMethod(){}
}
