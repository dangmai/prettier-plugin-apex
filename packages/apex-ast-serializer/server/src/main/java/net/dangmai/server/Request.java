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

    public Boolean getIdRef() {
        return idRef;
    }

    public void setIdRef(Boolean idRef) {
        this.idRef = idRef;
    }

    private Boolean idRef;

    public Boolean getPrettyPrint() {
        return prettyPrint;
    }

    public void setPrettyPrint(Boolean prettyPrint) {
        this.prettyPrint = prettyPrint;
    }

    private Boolean prettyPrint;

    public String getOutputFormat() {
        return outputFormat;
    }

    public void setOutputFormat(String outputFormat) {
        this.outputFormat = outputFormat;
    }

    private String outputFormat;
}
