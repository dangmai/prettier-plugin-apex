class LoopClass {
  void forLoop() {
    Integer count = 0;
    for (Integer i = 0; i < 10; i++)
      System.debug(i);

    for (count = 0; count < 10; count ++) {
      System.debug(count);
    }
    for (;;) {
    }
    for (Integer i = 1, j = 10; i < 20 && j > 0; j = j - 1) {
      System.debug(j);
      System.debug('Hi');
      if (j == 5) {
        break;
      }
    }

    for (Integer i = 0; i < 10; i ++) {

    }

    for (Contact a: [SELECT Id FROM Contact]) {
      System.debug(a);
    }

    for (Contact a: [SELECT Id, Name, Description, Birthdate FROM Contact WHERE Id != NULL AND Name != 'Hello']) {
      System.debug(a);
    }

    Contact[] contacts = new Contact[]{};
    for (Contact a: contacts) {
      System.debug(a);
    }
  }

  void whileLoop() {
    Integer i = 0;
    while (i < 10) {
      System.debug(i);
      if (i == 5) {
        break;
      }
      i++;
    }
    while (i < 5) {

    }
    while (true) {
      break;
    }
  }

  void doWhileLoop() {
    Integer i = 0;
    do {
      System.debug(i);
      if (i == 5) {
        break;
      }
      i ++;
    } while (count < 10);
    do {

    } while (count < 10);
  }
}

