class SOSLClass {
  void simpleSOSL() {
    String a = 'Hello';
    List<List<SObject>> searchResult = [FIND 'FirstLastName'];
    searchResult = [FIND :a];
  }
  void inClause() {
    List<List<SObject>> searchResult;
    searchResult = [FIND 'Hello' IN ALL FIELDS];
    searchResult = [FIND 'Hello' in all fields];
    searchResult = [FIND 'Hello' IN EMAIL FIELDS];
    searchResult = [FIND 'Hello' IN NAME FIELDS];
    searchResult = [FIND 'Hello' IN PHONE FIELDS];
    searchResult = [FIND 'Hello' IN SIDEBAR FIELDS];
  }
}
