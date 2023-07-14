package net.dangmai.serializer;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.InputStream;

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

    public static File getTestResourceFile(String fileName) {
        ClassLoader classLoader = TestUtilities.class.getClassLoader();
        return new File(classLoader.getResource(fileName).getFile());
    }
}
