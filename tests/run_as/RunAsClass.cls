@isTest
class RunAsClass {
  static testmethod void runAsTest() {
    User userOne = [SELECT Id FROM User LIMIT 1];
    User userTwo = [SELECT Id FROM User LIMIT 1 OFFSET 1];

    System.runAs(userOne) {
      System.debug('I am running as another user!');
    }

    System.runAs(userOne) {
      System.debug('First level');
      System.runAs(userTwo) {
        System.debug('Second level');
      }
    }

    System.runAs(new Version(1, 0)) {
      System.debug('I am running as a different version');
    }
  }
}

