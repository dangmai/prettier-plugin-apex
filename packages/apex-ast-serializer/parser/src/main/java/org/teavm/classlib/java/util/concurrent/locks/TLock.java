package org.teavm.classlib.java.util.concurrent.locks;

import org.teavm.classlib.java.util.concurrent.TTimeUnit;

public interface TLock {
  void lock();
  void lockInterruptibly() throws InterruptedException;
  boolean tryLock();
  boolean tryLock(long time, TTimeUnit unit) throws InterruptedException;
  void unlock();
}
