package apex.common.tuple;

public class IntPairInterner<T> {

  private final IntPairFactory<T> factory;

  public IntPairInterner(IntPairFactory<T> factory) {
    this.factory = factory;
  }

  public T intern(int x, int y) {
    return this.factory.create(x, y);
  }
}
