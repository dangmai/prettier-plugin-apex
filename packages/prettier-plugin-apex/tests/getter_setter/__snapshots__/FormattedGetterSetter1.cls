class GetterSetter {
  public String shortProperty { get; set; }

  public String veryLongPropertyNameThatWillExceedTheDefaultOfCharacterAndWillBreak {
    get;
    set;
  }

  public String nonDefaultGetter {
    get {
      return 'Hello';
    }
    private set;
  }

  public String nonDefaultSetter {
    private get;
    set {
      nonDefaultSetter = value;
    }
  }

  public String nonDefaultGetterSetter {
    get {
      return nonDefaultGetterSetter;
    }
    set {
      nonDefaultGetterSetter = value;
    }
  }
}
