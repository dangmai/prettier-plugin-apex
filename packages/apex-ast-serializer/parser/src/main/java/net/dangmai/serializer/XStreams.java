package net.dangmai.serializer;

import com.thoughtworks.xstream.XStream;

/**
 * Holds the two XStream serializer instances. On the JVM these are built on
 * first use; in the native image this class is initialized at build time
 * (see --initialize-at-build-time in build.gradle), so fully-configured
 * serializers are baked into the image heap and a fresh process pays no
 * XStream setup cost.
 */
final class XStreams {

  static final XStream COMPACT = Apex.buildXStream(false);
  static final XStream PRETTY = Apex.buildXStream(true);

  private XStreams() {}
}
