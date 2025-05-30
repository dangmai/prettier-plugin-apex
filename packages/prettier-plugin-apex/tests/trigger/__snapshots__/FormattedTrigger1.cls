trigger myAccountTrigger on Account(
  before delete,
  before insert,
  before update,
  after delete,
  after insert,
  after update,
  after undelete,
  before undelete
) {
  System.debug('Inside trigger');
  // prettier-ignore
  System.debug('There should be an empty line after this statement in the formatted code');

  if (Trigger.isBefore) {
    if (Trigger.isDelete) {
      for (Account a : Trigger.old) {
        if (a.name != 'okToDelete') {
          a.addError('You can\'t delete this record!');
        }
      }
    } else {
      for (Account a : Trigger.new) {
        if (a.name == 'bad') {
          a.name.addError('Bad name');
        }
      }
      if (Trigger.isInsert) {
        for (Account a : Trigger.new) {
          System.debug('New');
        }
      } else {
        if (Trigger.isInsert) {
          List<Contact> contacts = new List<Contact>();
          for (Account a : Trigger.new) {
            if (a.Name == 'makeContact') {
              System.debug('Make Contact');
            }
          }
        }
      }
    }
  }
}
