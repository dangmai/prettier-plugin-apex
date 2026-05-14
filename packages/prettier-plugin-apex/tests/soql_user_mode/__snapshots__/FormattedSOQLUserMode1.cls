class SOQLUserMode {
  void basicUserMode() {
    Account[] users = [SELECT Id FROM Account WITH USER_MODE];
    Account[] systems = [SELECT Id FROM Account WITH SYSTEM_MODE];
  }

  void caseVariants() {
    Account[] lower = [SELECT Id FROM Account WITH user_mode];
    Account[] mixed = [SELECT Id FROM Account WITH User_Mode];
    Account[] sysLower = [SELECT Id FROM Account WITH system_mode];
  }

  void withOtherClauses() {
    Account[] whereAndUserMode = [
      SELECT Id
      FROM Account
      WHERE Name = 'Acme'
      WITH USER_MODE
    ];
    Account[] userModeBeforeWhere = [
      SELECT Id
      FROM Account
      WHERE Name = 'Acme'
      WITH USER_MODE
      ORDER BY Name
    ];
    Account[] userModeWithGroup = [
      SELECT Industry, COUNT(Id)
      FROM Account
      WITH USER_MODE
      GROUP BY Industry
    ];
    Account[] userModeAllRows = [
      SELECT Id
      FROM Account
      WHERE IsDeleted = TRUE
      WITH USER_MODE
      ALL ROWS
    ];
    Account[] userModeForUpdate = [
      SELECT Id
      FROM Account
      WHERE Name LIKE 'A%'
      WITH USER_MODE
      LIMIT 50
      FOR UPDATE
    ];
  }

  void combinedWithIdentifiers() {
    Account[] userModeRandom = [
      SELECT Id
      FROM Account
      WITH USER_MODE WITH RANDOM_IDENTIFIER
    ];
    Account[] randomThenUserMode = [
      SELECT Id
      FROM Account
      WITH RANDOM_IDENTIFIER WITH USER_MODE
    ];
  }

  void longLineForcesWrapping() {
    Account[] longQuery = [
      SELECT
        Id,
        Name,
        BillingCity,
        BillingState,
        BillingCountry,
        ShippingCity,
        ShippingState,
        AnnualRevenue,
        NumberOfEmployees
      FROM Account
      WHERE
        Name LIKE 'Acme%'
        AND AnnualRevenue > 1000000
        AND NumberOfEmployees > 100
      WITH USER_MODE
      ORDER BY AnnualRevenue DESC, Name ASC NULLS LAST
      LIMIT 200
    ];
  }

  void multilineBodyTightenable() {
    Account[] verbose = [
      SELECT Id
      FROM Account
      WITH USER_MODE
    ];
    Account[] verboseSystem = [
      SELECT Id, Name
      FROM Account
      WHERE Name = 'Acme'
      WITH SYSTEM_MODE
      ORDER BY Name
      LIMIT 10
    ];
  }

  void embeddedComments() {
    Account[] trailingComment = [
      SELECT Id
      FROM Account
      WITH USER_MODE // <-- intentional
    ];
    Account[] commentsEverywhere = [
      // header comment
      SELECT
        Id, // trailing on column
        Name
      FROM Account // trailing on table
      WHERE Name = 'Acme' // trailing on predicate
      WITH USER_MODE // trailing on mode
      LIMIT 1 // trailing on limit
    ];
  }

  void subqueriesAndUserMode() {
    Account[] subquery = [
      SELECT Id, (SELECT Id FROM Contacts LIMIT 5)
      FROM Account
      WHERE Id IN (SELECT AccountId FROM Opportunity WHERE Amount > 10000)
      WITH USER_MODE
    ];
  }

  void weirdSpacing() {
    Account[] extraSpaces = [SELECT Id FROM Account WITH USER_MODE];
    Account[] mixedNewlines = [
      SELECT Id
      FROM Account
      WITH USER_MODE
      LIMIT 1
    ];
  }
}
