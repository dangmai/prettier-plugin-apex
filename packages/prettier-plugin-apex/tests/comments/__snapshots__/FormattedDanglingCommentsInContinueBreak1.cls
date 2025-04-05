class DanglingCommentsInContinueBreak {
  public static void printComment() {
    while (true) {
      continue; /* block comment on same line as ending semicolon for continue */
      break; /* block comment on same line as ending semicolon for break */
      continue; /* block comment on different line as ending semicolon for continue */
      break; /* block comment on different line as ending semicolon for break */
      continue; // line comment on different line as ending semicolon for continue
      break; // line comment on different line as ending semicolon for break
    }
    return; /* block comment on same line as ending semicolon for return */
    return; /* block comment on different line as ending semicolon for return */
    return; // line comment on different line as ending semicolon for return
  }
}
