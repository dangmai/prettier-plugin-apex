class ExceptionClass {
  void throwTestTest() {
    throw new CustomException('Custom Exception');

    Exception e = new Exception();
    throw new CustomException('Custom Inner Exception', e);
  }

  void tryCatchTest() {
    try {

    } catch (Exception e) {

    } finally {

    }

    try {
      Integer i = 0;
      i++;
    } catch (CustomException e) {
      System.debug('Oh no');
      throw new AnotherCustomException('Yikes', e);
    } finally {
      System.debug('It has been dealt with');
    }
  }

  class CustomException extends Exception {}
  class AnotherCustomException extends Exception {}
}

