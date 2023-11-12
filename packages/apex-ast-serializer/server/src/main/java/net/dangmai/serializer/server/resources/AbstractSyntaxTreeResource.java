package net.dangmai.serializer.server.resources;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.io.*;
import net.dangmai.serializer.Apex;
import net.dangmai.serializer.server.Request;

@Path("/")
public class AbstractSyntaxTreeResource {

  @GET
  @Produces(MediaType.TEXT_PLAIN)
  public String healthCheck() {
    return "Server up and running";
  }

  @POST
  public Response parse(Request request) throws Exception {
    Reader reader = new StringReader(request.getSourceCode());
    Writer writer = new StringWriter();
    Apex.OutputFormat format;
    Boolean anonymous = request.getAnonymous();
    Boolean idRef = request.getIdRef();
    Boolean prettyPrint = request.getPrettyPrint();
    String outputFormat = request.getOutputFormat();
    if (!outputFormat.equals("json") && !outputFormat.equals("xml")) {
      return Response
        .status(400)
        .entity("Unsupported output format")
        .type(MediaType.TEXT_PLAIN)
        .build();
    }
    if (outputFormat.equals("json")) {
      format = Apex.OutputFormat.JSON;
    } else {
      format = Apex.OutputFormat.XML;
    }

    Apex.getAST(format, anonymous, prettyPrint, idRef, reader, writer);

    return Response
      .status(200)
      .entity(writer.toString())
      .type(
        format == Apex.OutputFormat.JSON
          ? MediaType.APPLICATION_JSON
          : MediaType.APPLICATION_XML
      )
      .build();
  }
}
