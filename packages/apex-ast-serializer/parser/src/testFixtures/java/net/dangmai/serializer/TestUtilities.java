package net.dangmai.serializer;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.apache.commons.io.FileUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class TestUtilities {

  public static boolean isJSONValid(String test) {
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

  public static boolean isXmlValid(String test) {
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

  public static List<File> getApexTestFiles() throws IOException {
    ClassLoader classLoader = TestUtilities.class.getClassLoader();

    File folder = Collections.list(classLoader.getResources(""))
      .stream()
      .map(resource -> new File(resource.getFile()))
      .filter(
        f -> f.isDirectory() && f.getAbsolutePath().endsWith("resources/test")
      )
      .findFirst()
      .get();
    List<File> files = Arrays.stream(folder.listFiles())
      .filter(file -> file.isDirectory())
      .flatMap(dir -> Arrays.stream(dir.listFiles()))
      .filter(file -> file.isFile() && file.getName().endsWith(".cls"))
      // Currently there's an issue with XML serializer - it generates
      // non-compliant characters for \u0000-type characters, so we skip
      // the unicode test file for now
      .filter(f -> f.getName().indexOf("Unicode") == -1)
      .collect(Collectors.toList());
    return files;
  }

  public static File getApexTestFile(String fileName) throws IOException {
    List<File> files = getApexTestFiles();
    return files
      .stream()
      .filter(file -> file.getName().equals(fileName))
      .findFirst()
      .get();
  }

  public static JSONObject createJsonRequest(
    String format,
    Boolean anonymous,
    File file
  ) throws IOException {
    return new JSONObject()
      .put("anonymous", anonymous)
      .put("idRef", true)
      .put("prettyPrint", false)
      .put("outputFormat", format)
      .put(
        "sourceCode",
        FileUtils.readFileToString(file, StandardCharsets.UTF_8)
      );
  }

  public static String postRequest(JSONObject jsonInput) throws Exception {
    URL url = new URL("http://localhost:58867/api/ast/");
    HttpURLConnection con = (HttpURLConnection) url.openConnection();
    con.setRequestMethod("POST");
    con.setRequestProperty("Content-Type", "application/javascript");
    con.setDoOutput(true);
    try (OutputStream os = con.getOutputStream()) {
      byte[] input = jsonInput.toString().getBytes(StandardCharsets.UTF_8);
      os.write(input, 0, input.length);
    }
    try (
      BufferedReader br = new BufferedReader(
        new InputStreamReader(con.getInputStream(), StandardCharsets.UTF_8)
      )
    ) {
      StringBuilder response = new StringBuilder();
      String responseLine;
      while ((responseLine = br.readLine()) != null) {
        response.append(responseLine.trim());
      }
      return response.toString();
    }
  }
}
