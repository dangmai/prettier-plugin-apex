package org.teavm.classlib.java.util.concurrent.locks;

public interface TReadWriteLock {
  TLock readLock();
  TLock writeLock();
}
