class SafeNavigationOperator {
  void simpleOperator() {
    Integer notNullReturnValue = anInteger ?? 100;
    Account defaultAccount = new Account(name = 'Acme');

    Account a = [SELECT Id FROM Account
      WHERE Id = '001000000FAKEID'] ?? defaultAccount;

    Account b = [SELECT Id FROM Account
      WHERE Id = '001000000FAKEID'] ?? [SELECT Id FROM Account WHERE Id = '001000001FAKEID'];

    Account c = [SELECT Id FROM Account
      WHERE Id = '001000000FAKEID'] ?? [SELECT Id FROM Account WHERE Id = '001000001FAKEID' AND Very_Long_Field_Name__c = 'Hello'];

    string city = [Select BillingCity
      From Account
      Where Id = '001xx000000001oAAA']?.BillingCity;
    System.debug('Matches count: ' + city?.countMatches('San Francisco') ?? 100000000);
  }
}
