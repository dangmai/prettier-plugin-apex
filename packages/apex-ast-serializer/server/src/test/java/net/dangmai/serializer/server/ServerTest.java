package net.dangmai.serializer.server;

import net.dangmai.serializer.TestUtilities;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.*;

import static org.junit.jupiter.api.Assertions.*;

public class ServerTest {
    @BeforeAll
    public static void startServer() throws Exception {
        Thread serverThread = new Thread(() -> {
            try {
                HttpServer.main(new String[]{"-p", "58867", "-s", "-a", "secret" });
            } catch (Exception ex) {
                throw new RuntimeException("Exception caught in lambda", ex);
            }
        });
        serverThread.start();
        Thread.sleep(3000);  // so that the server can be brought up before tests are run
    }

    @Test
    void shouldGetJsonFromNamedApexFile() {
        assertDoesNotThrow(() -> {
            File file = TestUtilities.getTestResourceFile("NonEmptyNamedClass.cls");
            String content = TestUtilities.postRequest(TestUtilities.createJsonRequest("json", false, file));
            assertNotNull(content, "There should be content");
            assertTrue(TestUtilities.isJSONValid(content), "Content should be valid JSON");
        });
    }

    @Test
    void shouldGetXmlFromNamedApexFile() {
        assertDoesNotThrow(() -> {
            File file = TestUtilities.getTestResourceFile("NonEmptyNamedClass.cls");
            String content = TestUtilities.postRequest(TestUtilities.createJsonRequest("xml", false, file));
            assertNotNull(content, "There should be content");
            assertTrue(TestUtilities.isXmlValid(content), "Content should be valid XML");
        });
    }

    @Test
    void shouldGetJsonFromAnonymousApexFile() {
        assertDoesNotThrow(() -> {
            File file = TestUtilities.getTestResourceFile("NonEmptyNamedClass.cls");
            String content = TestUtilities.postRequest(TestUtilities.createJsonRequest("json", true, file));
            assertNotNull(content, "There should be content");
            assertTrue(TestUtilities.isJSONValid(content), "Content should be valid JSON");
        });
    }

    @Test
    void shouldGetXmlFromAnonymousApexFile() {
        assertDoesNotThrow(() -> {
            File file = TestUtilities.getTestResourceFile("NonEmptyNamedClass.cls");
            String content = TestUtilities.postRequest(TestUtilities.createJsonRequest("xml", true, file));
            assertNotNull(content, "There should be content");
            assertTrue(TestUtilities.isXmlValid(content), "Content should be valid XML");
        });
    }

}
