package org.teavm.classlib.java.util.concurrent.locks;

import org.teavm.classlib.java.util.concurrent.TTimeUnit;

public class TReentrantLock implements TLock {

  public void lock() {
    // do nothing
  }

  public void unlock() {
    // do nothing
  }

  public void lockInterruptibly() {
    // do nothing
  }

  public boolean tryLock() {
    // do nothing
    return true;
  }

  public boolean tryLock(long time, TTimeUnit unit) {
    // do nothing
    return true;
  }

  public boolean isHeldByCurrentThread() {
    // do nothing
    return true;
  }
}
