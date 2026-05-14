class SOSLUserMode {
  void basicUserMode() {
    List<List<SObject>> users = [FIND 'Acme' RETURNING Account WITH USER_MODE];
    List<List<SObject>> systems = [FIND 'Acme' RETURNING Account WITH SYSTEM_MODE];
  }

  void caseVariants() {
    List<List<SObject>> lower = [FIND 'Acme' RETURNING Account with user_mode];
    List<List<SObject>> mixed = [FIND 'Acme' RETURNING Account With User_Mode];
    List<List<SObject>> sysLower = [FIND 'Acme' RETURNING Account with system_mode];
  }

  void withInClause() {
    List<List<SObject>> inAllFields = [FIND 'Acme' IN ALL FIELDS RETURNING Account(Name) WITH USER_MODE];
    List<List<SObject>> inEmailFields = [FIND 'support@example.com' IN EMAIL FIELDS RETURNING Contact(Email, Name) WITH USER_MODE];
    List<List<SObject>> inNameFields = [FIND 'Acme' IN NAME FIELDS RETURNING Account(Name) WITH SYSTEM_MODE];
  }

  void combinedWithOtherClauses() {
    List<List<SObject>> withDivision = [FIND 'Acme' RETURNING Account(Name) WITH Division = 'Global' WITH USER_MODE];
    List<List<SObject>> withHighlight = [FIND 'Acme' RETURNING Account(Name) WITH HIGHLIGHT WITH USER_MODE];
    List<List<SObject>> withSnippet = [FIND 'Acme' RETURNING Account(Name) WITH SNIPPET (target_length=120) WITH USER_MODE];
    List<List<SObject>> withSpellCorrection = [FIND 'Acme' RETURNING Account(Name) WITH SPELL_CORRECTION = true WITH USER_MODE];
  }

  void longLineForcesWrapping() {
    List<List<SObject>> longQuery = [FIND 'Acme Corporation Headquarters' IN ALL FIELDS RETURNING Account(Id, Name, BillingCity, BillingState, BillingCountry WHERE Name LIKE 'Acme%' ORDER BY Name ASC LIMIT 100), Contact(Id, FirstName, LastName, Email LIMIT 50), Opportunity(Id, Name, Amount WHERE Amount > 1000 LIMIT 25) WITH USER_MODE];
  }

  void multilineBodyTightenable() {
    List<List<SObject>> verbose = [
      FIND 'Acme'
      RETURNING Account
      WITH USER_MODE
    ];
    List<List<SObject>> verboseSystem = [
      FIND 'Acme'
      IN ALL FIELDS
      RETURNING Account(Name)
      WITH SYSTEM_MODE
    ];
  }

  void embeddedComments() {
    List<List<SObject>> trailingComment = [
      FIND 'Acme'
      RETURNING Account
      WITH USER_MODE // intentional
    ];
    List<List<SObject>> commentsEverywhere = [
      // header
      FIND 'Acme' // trailing on FIND
      IN ALL FIELDS // trailing on IN clause
      RETURNING Account(Name)
      WITH USER_MODE // trailing on mode
    ];
  }

  void multipleReturningWithUserMode() {
    List<List<SObject>> multi = [
      FIND 'Acme'
      RETURNING Account(Name, Industry),
        Contact(FirstName, LastName),
        Opportunity(Name, Amount)
      WITH USER_MODE
    ];
  }

  void weirdSpacing() {
    List<List<SObject>> extraSpaces = [FIND 'Acme' RETURNING Account    WITH    USER_MODE];
    List<List<SObject>> mixedNewlines = [FIND 'Acme'
      RETURNING Account
      WITH USER_MODE];
  }
}
