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
      TestUtilities.getApexTestFiles().forEach(file -> {
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
      TestUtilities.getApexTestFiles().forEach(file -> {
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
      TestUtilities.getApexTestFiles().forEach(file -> {
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
      TestUtilities.getApexTestFiles().forEach(file -> {
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
  void shouldWritePerfTimingsWhenConfigured() throws Exception {
    File perfFile = File.createTempFile("apex-perf", ".json");
    perfFile.deleteOnExit();
    File apexFile = TestUtilities.getApexTestFiles().get(0);
    System.setProperty("apexPerfFile", perfFile.getAbsolutePath());
    try {
      byteArrayOutputStream = new ByteArrayOutputStream();
      runCli(null, new String[] { "-l", apexFile.getAbsolutePath() });

      String timing = java.nio.file.Files.readString(perfFile.toPath());
      assertTrue(timing.contains("parseNs"), "should record parseNs");
      assertTrue(timing.contains("serializeNs"), "should record serializeNs");
    } finally {
      System.clearProperty("apexPerfFile");
    }
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
