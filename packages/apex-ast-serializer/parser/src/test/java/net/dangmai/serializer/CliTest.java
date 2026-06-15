package net.dangmai.serializer;

import static org.junit.jupiter.api.Assertions.*;

import java.io.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class CliTest {

  private ByteArrayOutputStream byteArrayOutputStream;
  private PrintStream console;

  @BeforeEach
  public void setup() {
    console = System.out;
  }

  @Test
  void shouldGetJsonFromNamedApexFile() {
    assertDoesNotThrow(() -> {
      TestUtilities.getApexTestFiles()
        .forEach(file -> {
          try {
            byteArrayOutputStream = new ByteArrayOutputStream();
            runCli(null, new String[] { "-l", file.getAbsolutePath() });

            String content = byteArrayOutputStream.toString();
            assertNotNull(content, "There should be content");
            assertTrue(
              TestUtilities.isJSONValid(content),
              "Content should be valid JSON"
            );
          } catch (Exception e) {
            throw new RuntimeException(e);
          }
        });
    });
  }

  @Test
  void shouldGetJsonFromStdinApexFile() {
    assertDoesNotThrow(() -> {
      TestUtilities.getApexTestFiles()
        .forEach(file -> {
          try {
            byteArrayOutputStream = new ByteArrayOutputStream();
            runCli(new FileInputStream(file), new String[] {});

            String content = byteArrayOutputStream.toString();
            assertNotNull(content, "There should be content");
            assertTrue(
              TestUtilities.isJSONValid(content),
              "Content should be valid JSON"
            );
          } catch (Exception e) {
            throw new RuntimeException(e);
          }
        });
    });
  }

  @Test
  void shouldGetJsonFromAnonymousApexFile() {
    assertDoesNotThrow(() -> {
      TestUtilities.getApexTestFiles()
        .forEach(file -> {
          try {
            byteArrayOutputStream = new ByteArrayOutputStream();

            runCli(null, new String[] { "-a", "-l", file.getAbsolutePath() });

            String content = byteArrayOutputStream.toString();
            assertNotNull(content, "There should be content");
            assertTrue(
              TestUtilities.isJSONValid(content),
              "Content should be valid JSON"
            );
          } catch (Exception e) {
            throw new RuntimeException(e);
          }
        });
    });
  }

  @Test
  void shouldGetJsonFromStdinAnonymousApexFile() {
    assertDoesNotThrow(() -> {
      TestUtilities.getApexTestFiles()
        .forEach(file -> {
          try {
            byteArrayOutputStream = new ByteArrayOutputStream();
            runCli(new FileInputStream(file), new String[] { "-a" });

            String content = byteArrayOutputStream.toString();
            assertNotNull(content, "There should be content");
            assertTrue(
              TestUtilities.isJSONValid(content),
              "Content should be valid JSON"
            );
          } catch (Exception e) {
            throw new RuntimeException(e);
          }
        });
    });
  }

  @Test
  void shouldServeMultipleRequestsInStreamMode() throws Exception {
    String first = "public class First {}";
    String second = "public class Second { void doIt() {} }";
    String broken = "public class {";
    ByteArrayOutputStream requests = new ByteArrayOutputStream();
    for (String source : new String[] { first, second, broken }) {
      byte[] payload = source.getBytes("UTF-8");
      requests.write(("0 " + payload.length + "\n").getBytes("UTF-8"));
      requests.write(payload);
    }
    ByteArrayOutputStream responses = new ByteArrayOutputStream();
    Apex.runStream(
      new ByteArrayInputStream(requests.toByteArray()),
      responses
    );

    InputStream in = new ByteArrayInputStream(responses.toByteArray());
    for (int i = 0; i < 3; i++) {
      String header = Apex.readHeaderLine(in);
      assertNotNull(header, "There should be a response header");
      String[] parts = header.split(" ");
      // Parse errors are reported inside the JSON payload, so all three
      // requests (including the broken one) should report OK.
      assertEquals("OK", parts[0], "Response status should be OK");
      byte[] payload = in.readNBytes(Integer.parseInt(parts[1]));
      String content = new String(payload, "UTF-8");
      assertTrue(
        TestUtilities.isJSONValid(content),
        "Response payload should be valid JSON"
      );
    }
    assertEquals(-1, in.read(), "There should be exactly three responses");
  }

  private void runCli(final InputStream inputStream, final String[] params)
    throws Exception {
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
}
