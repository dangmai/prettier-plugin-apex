package org.teavm.classlib.java.util.concurrent.locks;

public class TReentrantReadWriteLock implements TReadWriteLock {

  public static class ReadLock extends TReentrantLock {}

  public static class WriteLock extends TReentrantLock {}

  public TReentrantReadWriteLock.ReadLock readLock() {
    return new TReentrantReadWriteLock.ReadLock();
  }

  public TReentrantReadWriteLock.WriteLock writeLock() {
    return new TReentrantReadWriteLock.WriteLock();
  }
}
