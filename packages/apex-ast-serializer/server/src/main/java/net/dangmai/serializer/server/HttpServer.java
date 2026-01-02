package net.dangmai.serializer.server;

import static org.eclipse.jetty.ee10.servlet.ServletContextHandler.NO_SESSIONS;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import java.util.Set;
import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.CommandLineParser;
import org.apache.commons.cli.DefaultParser;
import org.apache.commons.cli.Options;
import org.eclipse.jetty.ee10.servlet.ServletContextHandler;
import org.eclipse.jetty.ee10.servlet.ServletHolder;
import org.eclipse.jetty.server.Handler.Sequence;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.ServerConnector;
import org.eclipse.jetty.server.handler.CrossOriginHandler;
import org.eclipse.jetty.server.handler.ShutdownHandler;
import org.glassfish.jersey.servlet.ServletContainer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class HttpServer {

  private static final Logger LOGGER = LoggerFactory.getLogger(
    HttpServer.class
  );

  public static void main(String[] args) throws Exception {
    Options cliOptions = new Options();
    cliOptions.addOption(
      "h",
      "host",
      true,
      "The host to listen on, default to 0.0.0.0"
    );
    cliOptions.addOption(
      "p",
      "port",
      true,
      "The port to listen on, default to 2117"
    );
    cliOptions.addOption(
      "s",
      "shutdown",
      false,
      "Allow the server to be remotely shut down"
    );
    cliOptions.addOption(
      "a",
      "password",
      true,
      "Password to remotely shut down server"
    );
    cliOptions.addOption(
      "c",
      "cors-allowed-origins",
      true,
      "Comma-delimited list of allowed origins to be added the CORS response header"
    );
    cliOptions.addOption("v", "version", false, "Print version information.");

    CommandLineParser cliParser = new DefaultParser();
    CommandLine cmd = cliParser.parse(cliOptions, args);

    if (cmd.hasOption("v")) {
      try (
        InputStreamReader reader = new InputStreamReader(
          HttpServer.class.getResourceAsStream("/server.properties"),
          StandardCharsets.UTF_8
        )
      ) {
        Properties properties = new Properties();
        properties.load(reader);
        String version = properties.getProperty("version");
        System.out.println("v" + version);
      } catch (IOException e) {
        System.err.println("Failed to read version information.");
        e.printStackTrace();
      }
    } else {
      int port = cmd.hasOption("p")
        ? Integer.parseInt(cmd.getOptionValue("p"))
        : 2117;
      String host = cmd.hasOption("h") ? cmd.getOptionValue("h") : "0.0.0.0";
      Server server = new Server();

      ServerConnector httpConnector = new ServerConnector(server);
      httpConnector.setHost(host);
      httpConnector.setPort(port);
      httpConnector.setIdleTimeout(-1);
      server.addConnector(httpConnector);

      ServletContextHandler servletContextHandler = new ServletContextHandler(
        NO_SESSIONS
      );
      servletContextHandler.setContextPath("/api");
      ServletHolder servletHolder = servletContextHandler.addServlet(
        ServletContainer.class,
        "/ast/*"
      );
      servletHolder.setInitOrder(0);
      servletHolder.setInitParameter(
        "jersey.config.server.provider.packages",
        "net.dangmai.serializer.server.resources"
      );
      Sequence handlerSequence = new Sequence();
      if (cmd.hasOption("c")) {
        CrossOriginHandler crossOriginHandler = new CrossOriginHandler();
        crossOriginHandler.setAllowedOriginPatterns(
          Set.of(cmd.getOptionValue("c"))
        );
        handlerSequence.addHandler(crossOriginHandler);
      }

      handlerSequence.addHandler(servletContextHandler);
      if (cmd.hasOption("s")) {
        handlerSequence.addHandler(
          new ShutdownHandler(cmd.getOptionValue("a"))
        );
      }
      server.setHandler(handlerSequence);

      try {
        server.start();
        server.join();
      } catch (Exception ex) {
        LOGGER.error("Error occurred while starting Jetty", ex);
        System.exit(1);
      } finally {
        server.destroy();
      }
    }
  }
}
