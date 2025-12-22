class WithoutMultilineList {
  void testListLiterals() {
    // Empty list
    List<String> empty = new List<String>{};

    // Single entry - should stay inline regardless of option
    List<String> single = new List<String>{ 'item1' };

    // Multiple entries - should format multiline when option is enabled
    List<String> multiple = new List<String>{ 'item1', 'item2', 'item3' };

    // Multiple entries with longer strings
    List<String> multipleLong = new List<String>{
      'item1',
      'item2',
      'item3',
      'item4'
    };
  }
}
