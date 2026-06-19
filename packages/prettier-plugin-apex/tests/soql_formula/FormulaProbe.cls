class FormulaProbe {
  void basicFormula() {
    Opportunity[] opps = [
      SELECT Id FROM Opportunity WHERE FORMULA('Amount * 0.1') > 500
    ];
  }

  void formulaWithFieldReferences() {
    Opportunity[] opps = [
      SELECT Id, Name
      FROM Opportunity
      WHERE FORMULA('Amount - Discount__c') > 1000
      AND FORMULA('Account.AnnualRevenue / 12') >= 10000
    ];
  }

  void formulaComparedToBindVariable() {
    Decimal threshold = 500;
    Opportunity[] opps = [
      SELECT Id
      FROM Opportunity
      WHERE FORMULA('Amount * 0.1') > :threshold
    ];
  }

  void formulaCombinedWithLogicalOperators() {
    Account[] accounts = [
      SELECT Id, Name
      FROM Account
      WHERE (FORMULA('NumberOfEmployees * 1000') > 50000 OR Type = 'Prospect')
      AND FORMULA('AnnualRevenue - Expenses__c') > 0
    ];
  }

  void formulaComparedToString() {
    Account[] accounts = [
      SELECT Id FROM Account WHERE FORMULA('FirstName & LastName') = 'AcmeCorp'
    ];
  }

  void emptyFormula() {
    Account[] accounts = [
      SELECT Id FROM Account WHERE FORMULA('') > 0
    ];
  }

  void longFormulaLine() {
    Opportunity[] opps = [
      SELECT Id, Name, Amount, ExpectedRevenue, CloseDate, StageName, AccountId, OwnerId
      FROM Opportunity
      WHERE FORMULA('Amount * 0.15 + ExpectedRevenue * 0.05 - Discount__c + Adjustment__c') > 25000
    ];
  }

  void formulaKeywordCasing() {
    Account[] lower = [
      SELECT Id FROM Account WHERE formula('Amount * 0.1') > 500
    ];
    Account[] mixed = [
      SELECT Id FROM Account WHERE Formula('Amount * 0.1') > 500
    ];
  }

  void formulaWithComments() {
    Opportunity[] opps = [
      SELECT Id
      FROM Opportunity
      // filter on weighted amount
      WHERE FORMULA('Amount * 0.1') > 500
      AND /* inline */ FORMULA('ExpectedRevenue - Amount') > 0
    ];
  }
}
