// First Test Comment

/**
 * First ApexDoc
 */
trigger Case_trg on Case(before update) {
  System.debug('SOMETHING');
}
