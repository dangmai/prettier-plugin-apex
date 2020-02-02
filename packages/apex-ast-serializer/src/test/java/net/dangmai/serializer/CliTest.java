package net.dangmai.serializer;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.*;

import static org.junit.jupiter.api.Assertions.*;

public class CliTest {
    private ByteArrayOutputStream byteArrayOutputStream;
    private PrintStream console;

    @BeforeEach
    public void setup() {
        byteArrayOutputStream = new ByteArrayOutputStream();
        console = System.out;
    }

    @Test
    void shouldGetJsonFromNamedApexFile() {
        ClassLoader classLoader = getClass().getClassLoader();
        assertDoesNotThrow(() -> {
            File file = new File(classLoader.getResource("NonEmptyNamedClass.cls").getFile());
            runCli(null, new String[] { "-f", "json", "-l", file.getAbsolutePath() });

            String content = byteArrayOutputStream.toString();
            assertNotNull(content, "There should be content");
            assertTrue(isJSONValid(content), "Content should be valid JSON");
        });
    }

    @Test
    void shouldGetJsonFromStdinApexFile() {
        ClassLoader classLoader = getClass().getClassLoader();
        assertDoesNotThrow(() -> {
            File file = new File(classLoader.getResource("NonEmptyNamedClass.cls").getFile());
            runCli(new FileInputStream(file), new String[] { "-f", "json" });

            String content = byteArrayOutputStream.toString();
            assertNotNull(content, "There should be content");
            assertTrue(isJSONValid(content), "Content should be valid JSON");
        });
    }

    @Test
    void shouldGetXmlFromNamedApexFile() {
        ClassLoader classLoader = getClass().getClassLoader();
        assertDoesNotThrow(() -> {
            File file = new File(classLoader.getResource("NonEmptyNamedClass.cls").getFile());
            runCli(null, new String[] { "-f", "xml", "-l", file.getAbsolutePath() });

            String content = byteArrayOutputStream.toString();
            assertNotNull(content, "There should be content");
            assertTrue(isXmlValid(content), "Content should be valid XML");
        });
    }

    @Test
    void shouldGetXmlFromStdinApexFile() {
        ClassLoader classLoader = getClass().getClassLoader();
        assertDoesNotThrow(() -> {
            File file = new File(classLoader.getResource("NonEmptyNamedClass.cls").getFile());
            runCli(new FileInputStream(file), new String[] { "-f", "xml" });

            String content = byteArrayOutputStream.toString();
            assertNotNull(content, "There should be content");
            assertTrue(isXmlValid(content), "Content should be valid xml");
        });
    }

    @Test
    void shouldGetJsonFromAnonymousApexFile() {
        ClassLoader classLoader = getClass().getClassLoader();
        assertDoesNotThrow(() -> {
            File file = new File(classLoader.getResource("AnonymousClass.cls").getFile());
            runCli(null, new String[] { "-f", "json", "-l", file.getAbsolutePath() });

            String content = byteArrayOutputStream.toString();
            assertNotNull(content, "There should be content");
            assertTrue(isJSONValid(content), "Content should be valid JSON");
        });
    }

    @Test
    void shouldGetJsonFromStdinAnonymousApexFile() {
        ClassLoader classLoader = getClass().getClassLoader();
        assertDoesNotThrow(() -> {
            File file = new File(classLoader.getResource("AnonymousClass.cls").getFile());
            runCli(new FileInputStream(file), new String[] { "-f", "json" });

            String content = byteArrayOutputStream.toString();
            assertNotNull(content, "There should be content");
            assertTrue(isJSONValid(content), "Content should be valid JSON");
        });
    }

    @Test
    void shouldGetXmlFromAnonymousApexFile() {
        ClassLoader classLoader = getClass().getClassLoader();
        assertDoesNotThrow(() -> {
            File file = new File(classLoader.getResource("AnonymousClass.cls").getFile());
            runCli(null, new String[] { "-f", "xml", "-l", file.getAbsolutePath() });

            String content = byteArrayOutputStream.toString();
            assertNotNull(content, "There should be content");
            assertTrue(isXmlValid(content), "Content should be valid XML");
        });
    }

    @Test
    void shouldGetXmlFromStdinAnonymousApexFile() {
        ClassLoader classLoader = getClass().getClassLoader();
        assertDoesNotThrow(() -> {
            File file = new File(classLoader.getResource("AnonymousClass.cls").getFile());
            runCli(new FileInputStream(file), new String[] { "-f", "xml" });

            String content = byteArrayOutputStream.toString();
            assertNotNull(content, "There should be content");
            assertTrue(isXmlValid(content), "Content should be valid xml");
        });
    }

    private void runCli(final InputStream inputStream, final String[] params) throws Exception {
        final InputStream old = System.in;

        try {
            System.setOut(new PrintStream(byteArrayOutputStream));
            if (inputStream != null) {
                System.setIn(inputStream);
            }
            Apex.main(params);
        } finally {
            System.setOut(console);
            if (inputStream != null) {
                System.setIn(old);
            }
        }
    }

    private boolean isJSONValid(String test) {
        try {
            new JSONObject(test);
        } catch (JSONException ex) {
            // edited, to include @Arthur's comment
            // e.g. in case JSONArray is valid as well...
            try {
                new JSONArray(test);
            } catch (JSONException ex1) {
                return false;
            }
        }
        return true;
    }

    private boolean isXmlValid(String test) {
        try {
            DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
            DocumentBuilder db = dbf.newDocumentBuilder();
            InputStream inputStream = new ByteArrayInputStream(test.getBytes());
            db.parse(inputStream);
        } catch (Exception ex) {
            return false;
        }
        return true;
    }
}
