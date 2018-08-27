class EnumTest {
  public enum Season {WINTER, SPRING, SUMMER, FALL}
  enum Month {JANUARY, FEBRUARY, MARCH, APRIL, MAY, JUNE, JULY, AUGUST, SEPTEMBER, OCTOBER, NOVEMBER, DECEMBER}

  void enumTest() {
    Integer i = Season.WINTER.ordinal();
    String s = Season.SPRING.name();
    Season[] values = Season.values();
  }
}

