class DottedExpr {
  void dottedExprMethod() {
    a.Field__c = null;
    a .Field__c = null;
    CustomObject__c customObject = generator.objectBuilder.setExternalId(account.personContactId).getInstance();
    CustomObject__c customObject = generator.objectBuilder
      .setExternalId(account.personContactId)
      .getInstance();
  }
}
