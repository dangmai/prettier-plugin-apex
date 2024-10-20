package net.dangmai.serializer.server;

public class Request {

  public Boolean getAnonymous() {
    return anonymous;
  }

  public void setAnonymous(Boolean anonymous) {
    this.anonymous = anonymous;
  }

  private Boolean anonymous;

  public String getSourceCode() {
    return sourceCode;
  }

  public void setSourceCode(String sourceCode) {
    this.sourceCode = sourceCode;
  }

  private String sourceCode;

  public Boolean getPrettyPrint() {
    return prettyPrint;
  }

  public void setPrettyPrint(Boolean prettyPrint) {
    this.prettyPrint = prettyPrint;
  }

  private Boolean prettyPrint;
}
