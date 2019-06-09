package net.dangmai.serializer.server;


import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.CommandLineParser;
import org.apache.commons.cli.DefaultParser;
import org.apache.commons.cli.Options;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.handler.HandlerList;
import org.eclipse.jetty.server.handler.ShutdownHandler;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.glassfish.jersey.servlet.ServletContainer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import static org.eclipse.jetty.servlet.ServletContextHandler.NO_SESSIONS;

public class HttpServer {
    private static final Logger LOGGER = LoggerFactory.getLogger(HttpServer.class);
    public static void main(String[] args) throws Exception {
        Options cliOptions = new Options();
        cliOptions.addOption("p", "port", true, "The port to listen to");
        cliOptions.addOption("s", "shutdown", false, "Allow the server to be remotely shut down");
        cliOptions.addOption("a", "password", true, "Password to remotely shut down server");

        CommandLineParser cliParser = new DefaultParser();
        CommandLine cmd = cliParser.parse(cliOptions, args);

        int port = cmd.hasOption("p") ? Integer.parseInt(cmd.getOptionValue("p")) : 2117;
        Server server = new Server(port);

        ServletContextHandler servletContextHandler = new ServletContextHandler(NO_SESSIONS);
        servletContextHandler.setContextPath("/api");
        ServletHolder servletHolder = servletContextHandler.addServlet(ServletContainer.class, "/ast/*");
        servletHolder.setInitOrder(0);
        servletHolder.setInitParameter(
                "jersey.config.server.provider.packages",
                "net.dangmai.serializer.server.resources"
        );

        HandlerList handlerList = new HandlerList();
        handlerList.addHandler(servletContextHandler);
        if (cmd.hasOption("s")) {
            handlerList.addHandler(new ShutdownHandler(cmd.getOptionValue("a")));
        }
        server.setHandler(handlerList);

        try {
            server.start();
            server.join();
        } catch (Exception ex) {
            LOGGER.error("Error occurred while starting Jetty", ex);
            System.exit(1);
        }

        finally {
            server.destroy();
        }
    }
}
