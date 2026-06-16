package net.dangmai.serializer;

import com.thoughtworks.xstream.XStream;

/**
 * Cached XStream serializers, initialized at native-image build time
 * (see --initialize-at-build-time in build.gradle) so a fresh process pays
 * no XStream setup cost.
 */
final class XStreams {

  static final XStream COMPACT = Apex.buildXStream(false);
  static final XStream PRETTY = Apex.buildXStream(true);

  private XStreams() {}
}
