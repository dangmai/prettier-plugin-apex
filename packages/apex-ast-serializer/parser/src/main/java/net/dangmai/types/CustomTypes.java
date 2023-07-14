package net.dangmai.types;

import cz.habarta.typescript.generator.Settings;
import cz.habarta.typescript.generator.TsType;

import java.util.List;
import java.util.stream.Collectors;

public class CustomTypes {
    public static class MapKeyType extends TsType {
        @Override
        public String format(Settings settings) {
            return "{\"@class\": string}";
        }
    }
    public static class CustomTupleTsType extends TsType {
        public final List<TsType> types;

        public CustomTupleTsType(List<TsType> types) {
            this.types = types;
        }

        @Override
        public String format(Settings settings) {
            return "[" + types.stream().map(type -> type.format(settings)).collect(Collectors.joining(", ")) + "]";
        }
    }
}
