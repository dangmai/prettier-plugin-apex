package net.dangmai.serializer;

import apex.common.base.ObjectHash;
import com.google.common.base.MoreObjects;
import java.io.Serializable;

public final class IntPair implements Serializable {

  private final int x;
  private final int y;

  IntPair(int x, int y) {
    this.x = x;
    this.y = y;
  }

  public static IntPair tuple(int x, int y) {
    return new IntPair(x, y);
  }

  @Override
  public int hashCode() {
    return ObjectHash.hash(this.x, this.y);
  }

  @Override
  public boolean equals(Object obj) {
    if (this == obj) {
      return true;
    } else if (obj != null && this.getClass() == obj.getClass()) {
      IntPair other = (IntPair) obj;
      return this.x == other.x && this.y == other.y;
    } else {
      return false;
    }
  }

  @Override
  public String toString() {
    return MoreObjects.toStringHelper(this)
      .add("x", this.x)
      .add("y", this.y)
      .toString();
  }

  public int value0() {
    return this.x;
  }

  public int value1() {
    return this.y;
  }
}
