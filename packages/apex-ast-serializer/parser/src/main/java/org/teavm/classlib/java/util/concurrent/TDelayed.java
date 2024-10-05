package org.teavm.classlib.java.util.concurrent;

public interface TDelayed extends Comparable<TDelayed> {
  long getDelay(TTimeUnit unit);
}
