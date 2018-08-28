class NewObject {
  void newListTest() {
    List<String> a = new List<String>();
    List<String> aCopy = new List<String>(a);
    List<String> b = new String[]{};
    String[] c = new String[]{};
    String[] d = new String[]{'a', 'b'};
    String[] e = new String[]{'Long string number one', 'Long string number two'};
  }

  void newSetTest() {
    Set<String> a = new Set<String>();
    Set<String> aCopy = new Set<String>(aCopy);
    Set<String> b = new Set<String>{};
    Set<String> c = new Set<String>{'a', 'b'};
    Set<String> c = new Set<String>{'Long string number one', 'Long string number two'};
  }

  void newMapTest() {
    Map<String, String> a = new Map<String, String>();
    Map<String, String> aCopy = new Map<String, String>(a);
    Map<String, String> b = new Map<String, String>{};
    Map<String, String> c = new Map<String, String>{'a' => 'b', 'c' => 'd'};
    Map<String, String> c = new Map<String, String>{'Long string key' => 'Long string value', 'Long string key two' => 'Long string value two'};
    Map<String, String[]> d = new Map<String, String[]>{
      'a' => new String[]{'a','b'},
      'b' => new String[]{'c','d'}
    };
  }

  void newKeyValueTest() {
    Account a = new Account(Name='Account Name');
    Account b = new Account(Name='Account Name', Description='Account Description That Is Very Long');
  }

  void newStandardTest() {
    JWS a = new JWS('payload', 'certDevName');
    JWS b = new JWS('Very long payload but still fit in one line', 'very long cert dev name');
    JWS c = new JWS('Very long payload that is definitely too long so that all the parent groups must break', 'very long cert dev name');
  }
}

