class MultilineString {
  void basicPoem() {
    String myPoem = '''
       Multiline strings are here, hooray!
       You can start using them today.
       Triple quote, then start a new line,
       For example this will work fine,
       Poetry is not my forte!''';
  }

  void closerOnOwnLine() {
    String message = '''
      Dear customer,
      Your order has shipped.
      Thank you for your business.
    ''';
  }

  void singleContentLine() {
    String singleLineWithLeadingNewline = '''
hello''';
  }

  void escapesAndEmbeddedQuotes() {
    String withEscapes = '''
      line one\nstill line one (literal backslash-n)
      tab\there
      backslash: \\
    ''';
    String withEmbeddedQuotes = '''
      It's a beautiful day
      She said ''hi'' and waved
    ''';
  }

  void stringTemplate() {
    String message = '''
      Hello ${firstName},
      Your order was dispatched on ${dispatchDate}
    '''.template(new Map<String, Object>{
      'firstName' => 'Paul',
      'dispatchDate' => Date.today()
    });
  }

  void asMethodArgument() {
    System.debug('''
      passed straight into a call
    ''');
  }

  void inReturn() {
    return '''
      returned directly
    '''.template(new Map<String, Object>{ 'x' => 1 });
  }

  void inExpressions() {
    String concatenated = '''
      head
    ''' + ' tail';
    String ternary = cond
      ? '''
        when true
      '''
      : 'when false';
  }

  void withComments() {
    // leading line comment
    String a = '''
      content with a // not-a-comment inside
    '''; // trailing line comment
    String b = /* block before */ '''
      more content
    ''';
  }
}
