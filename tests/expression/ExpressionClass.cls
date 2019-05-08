class Conditional extends Object {
  void assignmentExpression() {
    Integer i = 0;
    Integer j = 1;
    if (i = j) {}
    if (i &= j) {}
    if (i |= j) {}
    if (i ^= j) {}
    if (i += j) {}
    if (i -= j) {}
    if (i *= j) {}
    if (i /= j) {}
    if (i <<= j) {}
    if (i >>= j) {}
    if (i >>>= j) {}
  }

  void ternaryExpression() {
    Integer a = 2;
    Integer b = 1;
    Integer c = a > b ? a : b;
    a < b ? System.debug('Hi') : System.debug('Hello');
  }

  void binaryExpression() {
    Integer i = 1;
    Integer j = 2;
    Integer a;

    a = i + j;
    a = i - j;
    a = i * j;
    a = i / j;
    a = i << j;
    a = i >> j;
    a = i >>> j;
    a = i ^ j;
    a = i & j;
    a = i | j;

    Integer result = oneRecord.get('Super Duper Long String That Will Break For Sure') + 1;
    Integer result = oneRecord.get('Super Duper Long String That Will Break For Sure') + anotherRecord.get('Another Super Duper Long String That Will Break For Sure');

    // Variable declaration
    String myString = 'a long string ' +
      'from concatenating ' +
      'many other strings ' +
      'together.';

    // Assignment Statement
    myString = 'a long string ' +
      'from concatenating ' +
      'many other strings ' +
      'together.';

    myVeryLongIntegerVariable = aVeryLongInteger + anotherVeryLongInteger * yetAnotherLongInterger - finallyThisVariable;
  }

  void castExpression() {
    String a;

    Id b = (Id) a;
    Schema.SObjectType sobjectType = ((Id) a).getSObjectType();
  }

  void instanceOfExpression() {
    SObject o;
    Boolean b = o instanceof Account;
  }

  void booleanExpression() {
    Boolean a = true;
    Boolean b = false;
    Boolean c;

    c = a == b;
    c = a === b;
    c = a !== b;
    c = a != b;
    c = a <> b;
    c = a < b;
    c = a > b;
    c = a <= b;
    c = a >= b;
    c = a && b;
    c = a || b;

    Boolean hasPrivateReports = (Integer) ([
      SELECT COUNT(Id) num
      FROM Report
      WHERE OwnerId = :UserInfo.getUserId()
    ]).get(0).get('num') > 0;
    Boolean result = oneRecord.get('Super Duper Long String That Will Break For Sure') > 1;
    Boolean result = oneRecord.get('Super Duper Long String That Will Break For Sure') > anotherRecord.get('Another Super Duper Long String That Will Break For Sure');

    Boolean myVeryLongBooleanVariable = anExtremelyVeryLongVariable >
      anotherVeryLongVariable >
      yetAnotherVeryLongVariable;

    myVeryLongBooleanVariable = anExtremelyVeryLongVariable > anotherVeryLongVariable && yetAnotherVeryLongVariable;

    myVeryLongBooleanVariable = anExtremelyVeryLongVariable > anotherVeryLongVariable == anExtremelyVeryLongVariable < anotherVeryLongVariable;
  }

  void triggerVariableExpr_inOtherSuite() {}

  void packageVersionExpression() {
    Package.Version.Request;
  }

  void prefixExpression() {
    Integer a = 1;
    Integer b;

    b = +a;
    b = -a;
    b = !a;
    b = ~a;
    b = ++a;
    b = --a;
  }

  void postfixExpression() {
    Integer a = 1;
    Integer b;

    b = a++;
    b = a--;
  }

  void arrayExpression() {
    Integer[] a = new Integer[]{1, 2, 3, 4};
    Integer b;
    Integer veryLongNumberThatMayExceedsTheLongestLineOwnItsOwnWithoutAnythingElseInTheWay = 1;

    b = a[0];
    b = a[a[0]];
    b = a[a[veryLongNumberThatMayExceedsTheLongestLineOwnItsOwnWithoutAnythingElseInTheWay]];
  }

  void variableExpression() {
    Integer a = 1;
    Integer b = 2;
    Integer c = a + b;
    longVariableName.Very_Long_SObject_Field_Name__c = longVariableName.Another_Very_Long_SObject_Field_Name__c;
  }

  void methodCallExpression() {
    SomeObject o = new SomeObject();
    String result = o.callMethod().getStringResult();
    String longResult = o.callMethod('first param').callAnotherMethod().getStringResult();
    String longResult = o.callMethod('first param', 'second param', 'thirdParam').callAnotherMethod().getStringResult();
    String longResult = o.callMethod('first param', 'second param', 'thirdParam', 'fourthParam', 'fifthParam', 'sixthParam');
    String longResult = o.callMethod('first param', 'second param', 'thirdParam', 'fourthParam', 'fifthParam', 'sixthParam').callAnotherMethod().getStringResult();
    String longResult = o.callAnotherMethod().getStringResult().callMethod('first param', 'second param', 'thirdParam', 'fourthParam', 'fifthParam', 'sixthParam');
    controller.callMethod(
      'A Super Long String That Will Break The Outer Parent And Lead To Complicated Result'
    );
  }

  void javaMethodCallExpression_notNeeded() {}

  void javaVariableExpression_notNeeded() {}

  void superVariableExpression() {
    super.methodCall();
    super.methodCall(1, 2, 3);
  }

  void thisVariableExpression() {
    this.a = 'Hello World';
    System.debug(this.a + this.b);
  }

  void classRefExpression() {
    System.Type t = Integer.class;
  }

  void literalExpression() {
    String a = 'Hello';
    Integer b = 1;
    Long c = 2147483648L;
    Double d = 0.1d;
    Decimal e = 2.14;
    Boolean f = true;
    Boolean g = false;
    Object h = null;
  }

  void soqlExpression_inOtherSuite() {}

  void soslExpression_inOtherSuite() {}

  class InnerClass extends ExpressionClass {
    InnerClass() {
      // ThisMethodCallExpression
      this(1);
    }

    InnerClass(Integer i) {
      // SuperMethodCallExpression
      super(i);
    }
  }
}
