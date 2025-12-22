class WithoutMultilineMap {
  void testMapLiterals() {
    // Empty map
    Map<String, String> empty = new Map<String, String>{};

    // Single entry - should stay inline regardless of option
    Map<String, String> single = new Map<String, String>{ 'key1' => 'value1' };

    // Multiple entries - should format multiline when option is enabled
    Map<String, String> multiple = new Map<String, String>{
      'key1' => 'value1',
      'key2' => 'value2',
      'key3' => 'value3'
    };

    // Multiple entries with longer strings
    Map<String, String> multipleLong = new Map<String, String>{
      'key1' => 'value1',
      'key2' => 'value2',
      'key3' => 'value3',
      'key4' => 'value4'
    };
  }
}
