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

  void emptyAndSingleLine() {
    String empty = '''''';
    String singleLine = '''one line of content''';
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
}
