class PrettierIgnore {
  public singleLineIgnore() {
    // The following node should not be formatted
    // prettier-ignore
    Integer result = oneRecord.get('Super Duper Long String That Will Break For Sure') + anotherRecord.get('Another Super Duper Long String That Will Break For Sure');

    // The following node should not be formatted
    /* prettier-ignore */
    Integer result = oneRecord.get('Super Duper Long String That Will Break For Sure') + anotherRecord.get('Another Super Duper Long String That Will Break For Sure');

    // The following node should be formatted
    Integer result = oneRecord.get('Super Duper Long String That Will Break For Sure') + anotherRecord.get('Another Super Duper Long String That Will Break For Sure');
  }

  // prettier-ignore
  public methodInlineCommentIgnore() {
    Integer result = oneRecord.get('Super Duper Long String That Will Break For Sure') + anotherRecord.get('Another Super Duper Long String That Will Break For Sure');

    Integer result = oneRecord.get('Super Duper Long String That Will Break For Sure') + anotherRecord.get('Another Super Duper Long String That Will Break For Sure');
  }

  /* prettier-ignore */
  public methodBlockCommentIgnore() {
    Integer result = oneRecord.get('Super Duper Long String That Will Break For Sure') + anotherRecord.get('Another Super Duper Long String That Will Break For Sure');

    Integer result = oneRecord.get('Super Duper Long String That Will Break For Sure') + anotherRecord.get('Another Super Duper Long String That Will Break For Sure');
  }
}
