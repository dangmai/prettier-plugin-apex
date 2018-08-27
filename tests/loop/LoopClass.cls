class LoopClass {
  void forLoop() {
    for (Integer i = 0; i < 10; i++)
      System.debug(i);

    for (Integer j = 10; j > 0; j = j - 1) {
      System.debug(j);
      System.debug('Hi');
      if (j == 5) {
        break;
      }
    }

    for (Contact a: [SELECT Id FROM Contact]) {
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
  }
}

