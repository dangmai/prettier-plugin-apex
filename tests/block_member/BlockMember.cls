class BlockMember {
  String memberOne;
  String anotherMember = 'Hello';
  private transient String anotherMemberTwo;
  static string anotherMemberThree;
  String memberWithGetSet { get; set; }
  String memberWithGetPrivateSet {
    get {
      return 1;
    }
    private set;
  }
  String memberWithSet {
    set {
      memberThree = value;
    }
  }

  void method() {
    System.debug('method');
  }

  class StatementBlockMember {
    {
      System.debug('Statement Block Member');
    }
  }
  class StaticStatementBlockMember {
    static {
      System.debug('Static Statement Block Member');
    }
  }
  interface InnerInterface {
    void interfaceMethod();
  }
  enum TestEnum { ONE, TWO }
}

