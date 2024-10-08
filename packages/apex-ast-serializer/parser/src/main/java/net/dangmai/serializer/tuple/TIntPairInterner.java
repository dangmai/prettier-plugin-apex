package net.dangmai.serializer.tuple;

import apex.common.tuple.IntPairFactory;

public class TIntPairInterner<T> {

  private final IntPairFactory<T> factory;

  public TIntPairInterner(IntPairFactory<T> factory) {
    this.factory = factory;
  }

  public T intern(int x, int y) {
    return this.factory.create(x, y);
  }
}
