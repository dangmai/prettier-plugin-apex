class CommentsWithModifiers {
  @TestVisible
  // Normal comment 1
  private enum AllOrAny { ALL, ANY }

  @TestVisible
  // Normal comment 2
  private enum AllOrAny { ALL, ANY }

  // prettier-ignore
  @TestVisible
  private enum AllOrAny { ALL, ANY }

  @TestVisible
  // prettier-ignore
  private enum AllOrAny { ALL, ANY }

  /* prettier-ignore */
  @TestVisible
  private enum AllOrAny { ALL, ANY }

  @TestVisible
  /* prettier-ignore */
  private enum AllOrAny { ALL, ANY }

  @TestVisible
  /* prettier-ignore */ private enum AllOrAny { ALL, ANY }
}
