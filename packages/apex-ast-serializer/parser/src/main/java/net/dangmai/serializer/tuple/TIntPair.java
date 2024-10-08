package net.dangmai.serializer.tuple;

import apex.common.base.ObjectHash;
import com.google.common.base.MoreObjects;
import java.io.Serializable;

public final class TIntPair implements Serializable {

  private final int x;
  private final int y;

  TIntPair(int x, int y) {
    this.x = x;
    this.y = y;
  }

  public static TIntPair tuple(int x, int y) {
    return new TIntPair(x, y);
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
      TIntPair other = (TIntPair) obj;
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
