package net.dangmai.serializer;

import org.graalvm.nativeimage.hosted.*;
import io.github.classgraph.*;

/**
 * This class is meant to be used by native-image to register reflection access.
 * See here: https://www.graalvm.org/22.1/reference-manual/native-image/Reflection/
 */
public class RuntimeReflectionRegistrationFeature implements Feature {
    public void beforeAnalysis(BeforeAnalysisAccess access) {
        System.out.println("Analyzing dependencies");
    try (ScanResult scanResult =
        new ClassGraph()
            .enableAllInfo()         // Scan classes, methods, fields, annotations
            .acceptPackages("apex.jorje", "com.google")
            .scan()) {               // Start the scan
        for (ClassInfo routeClassInfo : scanResult.getAllClasses()) {
            Class clazz = routeClassInfo.loadClass();
            RuntimeReflection.register(clazz);
            RuntimeReflection.register(clazz.getDeclaredFields());
        }
        }
    }
}
