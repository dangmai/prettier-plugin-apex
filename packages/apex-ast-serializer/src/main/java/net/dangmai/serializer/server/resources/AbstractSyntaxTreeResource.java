package net.dangmai.serializer.server.resources;

import net.dangmai.serializer.Apex;
import net.dangmai.serializer.server.Request;

import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.io.*;

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
            return Response.status(400).entity("Unsupported output format").type(MediaType.TEXT_PLAIN).build();
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
                .type(format == Apex.OutputFormat.JSON ? MediaType.APPLICATION_JSON : MediaType.APPLICATION_XML)
                .build();
    }
}
