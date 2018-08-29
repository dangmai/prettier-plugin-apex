class BlockMember {
  String fieldMemberOne;
  String anotherFieldMember = 'Hello';
  private transient String anotherFieldMemberTwo;
  static string anotherFieldMemberThree;

  String propertyMemberWithGetSet { get; set; }
  public String propertyMemberWithGetPrivateSet {
    get {
      return 1;
    }
    private set;
  }
  String propertyMemberWithOnlySet {
    set {
      memberThree = value;
    }
  }
  private String privatePropertyMemberWithOnlyGet {
    get {
      return 2;
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

