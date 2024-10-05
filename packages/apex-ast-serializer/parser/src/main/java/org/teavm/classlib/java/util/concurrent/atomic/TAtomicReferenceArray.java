package org.teavm.classlib.java.util.concurrent.atomic;

public class TAtomicReferenceArray<E> {

  TAtomicReference[] array;

  public TAtomicReferenceArray(int length) {
    this.array = new TAtomicReference[length];
  }

  public int length() {
    return this.array.length;
  }

  public E get(int i) {
    return (E) this.array[i].get();
  }

  public void set(int i, E newValue) {
    this.array[i].set(newValue);
  }
}
