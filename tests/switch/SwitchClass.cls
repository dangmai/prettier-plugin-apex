class SwitchClass {
  enum Month {JANUARY, FEBRUARY, MARCH, APRIL, MAY, JUNE, JULY, AUGUST, SEPTEMBER, OCTOBER, NOVEMBER, DECEMBER}

  public void switchTest() {
    Integer i = 1;
    Month s;
    sObject randomObject;

    switch on i {
      when 1 {
        System.debug('One');
      }
      when 2, 3, 4 {
        System.debug('Two three four');
      }
      when null {
        System.debug('Null');
      }
      when else {
        System.debug('Else');
      }
    }

    switch on s {
      when JANUARY {
        System.debug('January');
      }
      when FEBRUARY, MARCH, APRIL, MAY, JUNE, JULY, AUGUST, SEPTEMBER, OCTOBER, NOVEMBER, DECEMBER {
        System.debug('Other months');
      }
    }

    switch on randomObject {
      when Account a {
        System.debug('Account ' + a);
      }
      when Contact c {
        System.debug('Contact ' + c);
      }
      when Opportunity {
        System.debug('No variable');
      }
      when null {
        System.debug('Null');
      }
      when else {
        System.debug('Default');
      }
    }

    switch on SwitchCaseGenerator.setType('Switch Type').setMessage('The Most Important Message').setSeverity('High').getInstance() {
      when 1 {
        System.debug('1');
      }
      when else {
        System.debug('Else');
      }
    }
  }

  void soqlInSwitch() {
    switch on [SELECT Name FROM Contact LIMIT 1].Name {
      when 'Test Name' {
        System.debug('Test Name');
      }
      when else {
        System.debug('Everything Else');
      }
    }

    switch on [SELECT Id, Name FROM Contact WHERE Name = 'Super Long Name That Will Break The Line' LIMIT 1].Name {
      when 'Test Name' {
        System.debug('Test Name');
      }
      when else {
        System.debug('Everything Else');
      }
    }
  }
}

