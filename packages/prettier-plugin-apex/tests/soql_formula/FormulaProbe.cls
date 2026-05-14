class FormulaProbe {
  void basicFormula() {
    Opportunity[] opps = [
      SELECT Id FROM Opportunity WHERE FORMULA(Amount * 0.1) > 500
    ];
  }

  void formulaWithFieldReferences() {
    Opportunity[] opps = [
      SELECT Id, Name
      FROM Opportunity
      WHERE FORMULA(Amount - Discount__c) > 1000
      AND FORMULA(Account.AnnualRevenue / 12) >= 10000
    ];
  }

  void formulaOnBothSides() {
    Opportunity[] opps = [
      SELECT Id
      FROM Opportunity
      WHERE FORMULA(Amount * 0.1) > FORMULA(ExpectedRevenue * 0.05)
    ];
  }

  void formulaCombinedWithLogicalOperators() {
    Account[] accounts = [
      SELECT Id, Name
      FROM Account
      WHERE (FORMULA(NumberOfEmployees * 1000) > 50000 OR Type = 'Prospect')
      AND FORMULA(AnnualRevenue - Expenses__c) > 0
    ];
  }

  void nestedFormula() {
    Opportunity[] opps = [
      SELECT Id
      FROM Opportunity
      WHERE FORMULA(FORMULA(Amount * 0.1) + Discount__c) > 100
    ];
  }

  void longFormulaLine() {
    Opportunity[] opps = [
      SELECT Id, Name, Amount, ExpectedRevenue, CloseDate, StageName, AccountId, OwnerId
      FROM Opportunity
      WHERE FORMULA(Amount * 0.15 + ExpectedRevenue * 0.05 - Discount__c + Adjustment__c) > 25000
    ];
  }

  void formulaWithComments() {
    Opportunity[] opps = [
      SELECT Id
      FROM Opportunity
      // filter on weighted amount
      WHERE FORMULA(Amount * 0.1) > 500
      AND /* inline */ FORMULA(ExpectedRevenue - Amount) > 0
    ];
  }
}
