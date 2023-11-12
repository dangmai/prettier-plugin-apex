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
    byteArrayOutputStream = new ByteArrayOutputStream();
    console = System.out;
  }

  @Test
  void shouldGetJsonFromNamedApexFile() {
    assertDoesNotThrow(() -> {
      File file = TestUtilities.getTestResourceFile("NonEmptyNamedClass.cls");
      runCli(null, new String[] { "-f", "json", "-l", file.getAbsolutePath() });

      String content = byteArrayOutputStream.toString();
      assertNotNull(content, "There should be content");
      assertTrue(
        TestUtilities.isJSONValid(content),
        "Content should be valid JSON"
      );
    });
  }

  @Test
  void shouldGetJsonFromStdinApexFile() {
    assertDoesNotThrow(() -> {
      File file = TestUtilities.getTestResourceFile("NonEmptyNamedClass.cls");
      runCli(new FileInputStream(file), new String[] { "-f", "json" });

      String content = byteArrayOutputStream.toString();
      assertNotNull(content, "There should be content");
      assertTrue(
        TestUtilities.isJSONValid(content),
        "Content should be valid JSON"
      );
    });
  }

  @Test
  void shouldGetXmlFromNamedApexFile() {
    assertDoesNotThrow(() -> {
      File file = TestUtilities.getTestResourceFile("NonEmptyNamedClass.cls");
      runCli(null, new String[] { "-f", "xml", "-l", file.getAbsolutePath() });

      String content = byteArrayOutputStream.toString();
      assertNotNull(content, "There should be content");
      assertTrue(
        TestUtilities.isXmlValid(content),
        "Content should be valid XML"
      );
    });
  }

  @Test
  void shouldGetXmlFromStdinApexFile() {
    assertDoesNotThrow(() -> {
      File file = TestUtilities.getTestResourceFile("NonEmptyNamedClass.cls");
      runCli(new FileInputStream(file), new String[] { "-f", "xml" });

      String content = byteArrayOutputStream.toString();
      assertNotNull(content, "There should be content");
      assertTrue(
        TestUtilities.isXmlValid(content),
        "Content should be valid xml"
      );
    });
  }

  @Test
  void shouldGetJsonFromAnonymousApexFile() {
    assertDoesNotThrow(() -> {
      File file = TestUtilities.getTestResourceFile("NonEmptyNamedClass.cls");
      runCli(
        null,
        new String[] { "-a", "-f", "json", "-l", file.getAbsolutePath() }
      );

      String content = byteArrayOutputStream.toString();
      assertNotNull(content, "There should be content");
      assertTrue(
        TestUtilities.isJSONValid(content),
        "Content should be valid JSON"
      );
    });
  }

  @Test
  void shouldGetJsonFromStdinAnonymousApexFile() {
    assertDoesNotThrow(() -> {
      File file = TestUtilities.getTestResourceFile("NonEmptyNamedClass.cls");
      runCli(new FileInputStream(file), new String[] { "-a", "-f", "json" });

      String content = byteArrayOutputStream.toString();
      assertNotNull(content, "There should be content");
      assertTrue(
        TestUtilities.isJSONValid(content),
        "Content should be valid JSON"
      );
    });
  }

  @Test
  void shouldGetXmlFromAnonymousApexFile() {
    assertDoesNotThrow(() -> {
      File file = TestUtilities.getTestResourceFile("NonEmptyNamedClass.cls");
      runCli(
        null,
        new String[] { "-a", "-f", "xml", "-l", file.getAbsolutePath() }
      );

      String content = byteArrayOutputStream.toString();
      assertNotNull(content, "There should be content");
      assertTrue(
        TestUtilities.isXmlValid(content),
        "Content should be valid XML"
      );
    });
  }

  @Test
  void shouldGetXmlFromStdinAnonymousApexFile() {
    assertDoesNotThrow(() -> {
      File file = TestUtilities.getTestResourceFile("NonEmptyNamedClass.cls");
      runCli(new FileInputStream(file), new String[] { "-a", "-f", "xml" });

      String content = byteArrayOutputStream.toString();
      assertNotNull(content, "There should be content");
      assertTrue(
        TestUtilities.isXmlValid(content),
        "Content should be valid xml"
      );
    });
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
