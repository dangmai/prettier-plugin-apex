class EnumTest {
  public enum Season {
    WINTER,
    SPRING,
    SUMMER,
    FALL
  }
  enum Month {
    JANUARY,
    FEBRUARY,
    MARCH,
    APRIL,
    MAY,
    JUNE,
    JULY,
    AUGUST,
    SEPTEMBER,
    OCTOBER,
    NOVEMBER,
    DECEMBER
  }

  @TestVisible
  private enum AccountTypeOne {
    BUSINESS_ACCOUNT,
    PERSON_ACCOUNT
  }

  @TestVisible
  public enum AccountTypeTwo {
    BUSINESS_ACCOUNT,
    PERSON_ACCOUNT
  }

  @TestVisible
  public static enum AccountTypeTwo {
    BUSINESS_ACCOUNT,
    PERSON_ACCOUNT
  }

  @TestVisible
  enum AccountTypeThree {
    BUSINESS_ACCOUNT,
    PERSON_ACCOUNT
  }

  void enumTest() {
    Integer i = Season.WINTER.ordinal();
    String s = Season.SPRING.name();
    Season[] values = Season.values();
  }
}
