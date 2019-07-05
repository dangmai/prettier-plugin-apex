class Literal {
  void nullExpression() {
    return null;
    return NULL;
    return Null;
  }
  void stringLiteral() {
    return 'a';
    return '"non-escaped quotes"';
  }
  void integerLiteral() {
    return 1;
  }
  void longLiteral() {
    return 2147483648L;
    return 2147483640L;
    return 2312321321L ;
  }
  void decimalLiteral() {
    return 1.01D;
    return 1.0D;
    return 1.00D;
    return 1.30D;
    return 1.30D ;
  }
  void doubleLiteral() {
    return 1.1;
    return 1.0;
    return 1.00;
    return 1.30;
  }
  void trueLiteral() {
    return true;
    return TRUE;
    return True;
  }
  void falseLiteral() {
    return false;
    return FALSE;
    return False;
  }
}
