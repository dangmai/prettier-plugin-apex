class SOSLReturningComment {
  void trailingLineCommentAfterLastField() {
    List<List<SObject>> r = [
      FIND 'Acme'
      RETURNING Account(
        Name // trailing comment
      )
    ];
  }

  void trailingBlockCommentAfterLastField() {
    List<List<SObject>> r = [
      FIND 'Acme'
      RETURNING Account(
        Name /* trailing block comment */
      )
    ];
  }

  void leadingCommentBeforeFirstField() {
    List<List<SObject>> r = [
      FIND 'Acme'
      RETURNING Account(
        // leading comment
        Name
      )
    ];
  }

  void commentBetweenFields() {
    List<List<SObject>> r = [
      FIND 'Acme'
      RETURNING Account(
        Id,
        // between fields
        Name
      )
    ];
  }

  void trailingCommentWithWhereClause() {
    List<List<SObject>> r = [
      FIND 'Acme'
      RETURNING Account(
        Id,
        Name // trailing comment
        WHERE Name = 'Acme'
      )
    ];
  }

  void trailingCommentWithOrderByClause() {
    List<List<SObject>> r = [
      FIND 'Acme'
      RETURNING Account(
        Id,
        Name // trailing comment
        ORDER BY Name ASC
      )
    ];
  }

  void trailingCommentWithLimitClause() {
    List<List<SObject>> r = [
      FIND 'Acme'
      RETURNING Account(
        Id,
        Name // trailing comment
        LIMIT 10
      )
    ];
  }

  void commentAfterSubclauseInsideParens() {
    List<List<SObject>> r = [
      FIND 'Acme'
      RETURNING Account(
        Id,
        Name
        WHERE Name = 'Acme' // trailing comment after where
      )
    ];
  }

  void trailingCommentWithUserMode() {
    List<List<SObject>> r = [
      FIND 'Acme'
      RETURNING Account(
        Name // trailing comment
      )
      WITH USER_MODE
    ];
  }
}
