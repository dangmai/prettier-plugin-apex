public class Unicode {
  public void unicodeCharacterTest() {
    String a = '––––';
    Account[] accounts = [SELECT Id FROM Account WHERE Name = 'Test – Name'];

    /*
    system.debug('Hi');
    */
  }

  // 名前
  private String name;

  // セッター
  public void setName(String name) {
    this.name = this.name;
    String mixedCodePoints = '\u0000 \u001f \u007f \uffff 前';
    String mixedEscapedCodePoints = '\\u0000 \\u001f \\u007f \\uffff 前';
  }
}
