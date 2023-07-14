package net.dangmai.serializer;

import net.dangmai.serializer.TestUtilities;
import net.dangmai.serializer.server.HttpServer;
import org.apache.commons.io.FileUtils;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

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
            String content = postRequest(createJsonRequest("json", false, file));
            assertNotNull(content, "There should be content");
            assertTrue(TestUtilities.isJSONValid(content), "Content should be valid JSON");
        });
    }

    @Test
    void shouldGetXmlFromNamedApexFile() {
        assertDoesNotThrow(() -> {
            File file = TestUtilities.getTestResourceFile("NonEmptyNamedClass.cls");
            String content = postRequest(createJsonRequest("xml", false, file));
            assertNotNull(content, "There should be content");
            assertTrue(TestUtilities.isXmlValid(content), "Content should be valid XML");
        });
    }

    @Test
    void shouldGetJsonFromAnonymousApexFile() {
        assertDoesNotThrow(() -> {
            File file = TestUtilities.getTestResourceFile("NonEmptyNamedClass.cls");
            String content = postRequest(createJsonRequest("json", true, file));
            assertNotNull(content, "There should be content");
            assertTrue(TestUtilities.isJSONValid(content), "Content should be valid JSON");
        });
    }

    @Test
    void shouldGetXmlFromAnonymousApexFile() {
        assertDoesNotThrow(() -> {
            File file = TestUtilities.getTestResourceFile("NonEmptyNamedClass.cls");
            String content = postRequest(createJsonRequest("xml", true, file));
            assertNotNull(content, "There should be content");
            assertTrue(TestUtilities.isXmlValid(content), "Content should be valid XML");
        });
    }

    private static JSONObject createJsonRequest(String format, Boolean anonymous, File file) throws IOException {
        return new JSONObject()
                .put("anonymous", anonymous)
                .put("idRef", true)
                .put("prettyPrint", false)
                .put("outputFormat", format)
                .put("sourceCode", FileUtils.readFileToString(file, StandardCharsets.UTF_8));
    }

    private static String postRequest(JSONObject jsonInput) throws Exception {
        URL url = new URL("http://localhost:58867/api/ast/");
        HttpURLConnection con = (HttpURLConnection) url.openConnection();
        con.setRequestMethod("POST");
        con.setRequestProperty("Content-Type", "application/javascript");
        con.setDoOutput(true);
        try(OutputStream os = con.getOutputStream()) {
            byte[] input = jsonInput.toString().getBytes(StandardCharsets.UTF_8);
            os.write(input, 0, input.length);
        }
        try(BufferedReader br = new BufferedReader(new InputStreamReader(con.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder response = new StringBuilder();
            String responseLine;
            while ((responseLine = br.readLine()) != null) {
                response.append(responseLine.trim());
            }
            return response.toString();
        }
    }
}
