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
    Boolean anonymous = request.getAnonymous();
    Boolean prettyPrint = request.getPrettyPrint();

    Apex.getAST(anonymous, prettyPrint, reader, writer);

    return Response.status(200)
      .entity(writer.toString())
      .type(MediaType.APPLICATION_JSON)
      .build();
  }
}
