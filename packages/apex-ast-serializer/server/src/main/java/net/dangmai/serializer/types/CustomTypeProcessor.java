package net.dangmai.serializer.types;

import cz.habarta.typescript.generator.DefaultTypeProcessor;
import cz.habarta.typescript.generator.TsType;
import cz.habarta.typescript.generator.TypeProcessor;
import cz.habarta.typescript.generator.util.Utils;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.Arrays;
import java.util.Map;
import java.util.Optional;

public class CustomTypeProcessor implements TypeProcessor {

  private Chain chain;

  public CustomTypeProcessor() {
    this.chain = new Chain(
      Arrays.asList(new MapProcessor(), new OptionalProcessor())
    );
  }

  /**
   * Map jorje's {@code Optional<T>} fields to {@code JorjeOptional<T>} (i.e.
   * {@code { value?: T }}) instead of letting the default handling unwrap them
   * to a bare optional property. This matches the runtime shape the serializer
   * emits ({@code {"value": …}} / {@code {}}) so the printer's `.value` reads
   * type-check. The declaration is added by {@link JorjeOptionalExtension}.
   */
  public static class OptionalProcessor implements TypeProcessor {

    @Override
    public TypeProcessor.Result processType(
      Type javaType,
      TypeProcessor.Context context
    ) {
      final Class<?> rawClass = Utils.getRawClassOrNull(javaType);
      if (
        rawClass == null ||
        !Optional.class.isAssignableFrom(rawClass) ||
        !(javaType instanceof ParameterizedType)
      ) {
        return null;
      }
      ParameterizedType parameterizedType = (ParameterizedType) javaType;
      TypeProcessor.Result inner = context.processType(
        parameterizedType.getActualTypeArguments()[0]
      );
      TsType wrapped = new TsType.GenericReferenceType(
        JorjeOptionalExtension.SYMBOL,
        inner.getTsType()
      );
      return new TypeProcessor.Result(wrapped, inner.getDiscoveredClasses());
    }
  }

  @Override
  public TypeProcessor.Result processType(
    Type javaType,
    TypeProcessor.Context context
  ) {
    return chain.processType(javaType, context);
  }

  public static class MapProcessor implements TypeProcessor {

    @Override
    public TypeProcessor.Result processType(
      Type javaType,
      TypeProcessor.Context context
    ) {
      final Class<?> rawClass = Utils.getRawClassOrNull(javaType);
      if (
        rawClass == null ||
        !Map.class.isAssignableFrom(rawClass) ||
        !(javaType instanceof ParameterizedType)
      ) {
        return null;
      }
      ParameterizedType parameterizedType = (ParameterizedType) javaType;
      DefaultTypeProcessor defaultTypeProcessor = new DefaultTypeProcessor();
      TypeProcessor.Result defaultResult = defaultTypeProcessor.processType(
        javaType,
        context
      );
      TsType resultType = new TsType.BasicArrayType(
        new CustomTypes.CustomTupleTsType(
          Arrays.asList(
            new CustomTypes.MapKeyType(),
            (new DefaultTypeProcessor()
                .processType(
                  parameterizedType.getActualTypeArguments()[1],
                  context
                )).getTsType()
          )
        )
      );
      return new TypeProcessor.Result(
        resultType,
        defaultResult.getDiscoveredClasses()
      );
    }
  }
}
