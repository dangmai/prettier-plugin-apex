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

  public endOfLineIgnore() {
    // The following node should not be formatted
    Integer result = oneRecord.get('Super Duper Long String That Will Break For Sure') + anotherRecord.get('Another Super Duper Long String That Will Break For Sure'); // prettier-ignore

    // The following node should not be formatted
    Integer result = oneRecord.get('Super Duper Long String That Will Break For Sure') + anotherRecord.get('Another Super Duper Long String That Will Break For Sure'); /* prettier-ignore */
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

  public conditionalElseIgnore() {
    if (someCondition) {
      System.debug('foo');
    }

    // comment about condition that should be printed 1
    // prettier-ignore
    else if (someOtherCondition) {
      System.debug('bar');
    }

    // comment about catch-all that should be printed 1
    // prettier-ignore
    else {
      System.debug('no');
    }

    if (someCondition) {
      System.debug('foo');
    }

    // comment about condition that should be printed 2
    /* prettier-ignore */ else if (someOtherCondition) {
      System.debug('bar');
    }

    // comment about catch-all that should be printed 2
    /* prettier-ignore */ else {
      System.debug('no');
    }

    if (someCondition)
      System.debug('foo');

    // prettier-ignore
    else if (someOtherCondition)
      System.debug('bar');

    // prettier-ignore
    else
      System.debug('no');
  }

  public tryCatchIgnore() {
    try {
      System.debug('foo');
    }

    // comment about catch 1 that should be printed 1
    // prettier-ignore
    catch (Exception ex) {
      System.debug('bar');
    }

    // comment about catch 2 that should be printed 1
    // prettier-ignore
    catch (AnotherException ex) {
      System.debug('no');
    }

    // comment about finally that should be printed 1
    // prettier-ignore
    finally {
      System.debug('finally');
    }

    try {
      System.debug('foo');
    }

    // comment about catch 1 that should be printed 2
    /* prettier-ignore */ catch (Exception ex) {
      System.debug('bar');
    }

    // comment about catch 2 that should be printed 2
    /* prettier-ignore */ catch (AnotherException ex) {
      System.debug('no');
    }

    // comment about finally that should be printed 2
    /* prettier-ignore */ finally {
      System.debug('finally');
    }
  }
}
