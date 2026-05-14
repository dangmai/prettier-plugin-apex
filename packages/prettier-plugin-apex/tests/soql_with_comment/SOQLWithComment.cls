class SOQLWithComment {
  public void securityEnforcedLineComment() {
    Account[] a = [
      SELECT Id, Name
      FROM Account
      // preceding line comment
      WITH SECURITY_ENFORCED
    ];
  }

  public void securityEnforcedBlockComment() {
    Account[] a = [
      SELECT Id, Name
      FROM Account
      /* preceding block comment */
      WITH SECURITY_ENFORCED
    ];
  }

  public void userModeLineComment() {
    Account[] a = [
      SELECT Id, Name
      FROM Account
      // preceding line comment
      WITH USER_MODE
    ];
  }

  public void userModeBlockComment() {
    Account[] a = [
      SELECT Id, Name
      FROM Account
      /* preceding block comment */
      WITH USER_MODE
    ];
  }

  public void systemModeLineComment() {
    Account[] a = [
      SELECT Id, Name
      FROM Account
      // preceding line comment
      WITH SYSTEM_MODE
    ];
  }

  public void systemModeBlockComment() {
    Account[] a = [
      SELECT Id, Name
      FROM Account
      /* preceding block comment */
      WITH SYSTEM_MODE
    ];
  }

  public void withDivisionValue() {
    Account[] a = [
      SELECT Id, Name
      FROM Account
      // preceding line comment
      WITH DIVISION = 'Global'
    ];
  }

  public void afterWhereClause() {
    Account[] a = [
      SELECT Id, Name
      FROM Account
      WHERE Name = 'Hello'
      // preceding line comment
      WITH SECURITY_ENFORCED
    ];
  }
}
