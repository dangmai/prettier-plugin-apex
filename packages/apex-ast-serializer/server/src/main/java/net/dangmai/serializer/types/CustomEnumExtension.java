package net.dangmai.serializer.types;

import cz.habarta.typescript.generator.Extension;
import cz.habarta.typescript.generator.TsProperty;
import cz.habarta.typescript.generator.TsType;
import cz.habarta.typescript.generator.compiler.ModelCompiler;
import cz.habarta.typescript.generator.compiler.Symbol;
import cz.habarta.typescript.generator.compiler.TsModelTransformer;
import cz.habarta.typescript.generator.emitter.*;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * This class modifies how Enum typings are generated to align with how XStream
 * serializes Enums. Basically it wraps Enum types in an interface that looks
 * like `{"$": EnumType, "@class": ClassName}`
 */
public class CustomEnumExtension extends Extension {

  @Override
  public EmitterExtensionFeatures getFeatures() {
    return new EmitterExtensionFeatures();
  }

  @Override
  public List<TransformerDefinition> getTransformers() {
    return Arrays.asList(
      new TransformerDefinition(
        ModelCompiler.TransformationPhase.BeforeEnums,
        (TsModelTransformer) (context, model) -> transformEnums(model)
      )
    );
  }

  private static TsType generateCustomEnumType(
    TsType tsType,
    Map<Symbol, TsEnumModel> enumSymbolTargetMap
  ) {
    return new TsType.ObjectType(
      new TsProperty("$", tsType),
      new TsProperty(
        "@class",
        new TsType.StringLiteralType(
          enumSymbolTargetMap
            .get(((TsType.ReferenceType) tsType).symbol)
            .getOrigin()
            .getName()
        )
      )
    );
  }

  private TsModel transformEnums(TsModel tsModel) {
    final List<TsEnumModel> stringEnums = tsModel.getEnums();
    final List<Symbol> enumSymbols = stringEnums
      .stream()
      .map(TsDeclarationModel::getName)
      .collect(Collectors.toList());
    final Map<Symbol, TsEnumModel> enumSymbolTargetMap = stringEnums
      .stream()
      .collect(Collectors.toMap(TsEnumModel::getName, Function.identity()));
    final List<TsBeanModel> beanModels = tsModel.getBeans();
    return tsModel.withBeans(
      beanModels
        .stream()
        .map(beanModel -> {
          List<TsPropertyModel> properties = beanModel
            .getProperties()
            .stream()
            .map(property -> {
              if (
                property.tsType instanceof TsType.ReferenceType &&
                enumSymbols.contains(
                  ((TsType.ReferenceType) property.tsType).symbol
                )
              ) {
                property =
                  property.withTsType(
                    generateCustomEnumType(property.tsType, enumSymbolTargetMap)
                  );
              } else if (
                property.tsType instanceof TsType.BasicArrayType &&
                ((TsType.BasicArrayType) property.tsType).elementType instanceof
                  TsType.ReferenceType &&
                enumSymbols.contains(
                  ((TsType.ReferenceType) ((TsType.BasicArrayType) property.tsType).elementType).symbol
                )
              ) {
                property =
                  property.withTsType(
                    new TsType.BasicArrayType(
                      generateCustomEnumType(
                        ((TsType.BasicArrayType) property.tsType).elementType,
                        enumSymbolTargetMap
                      )
                    )
                  );
              }
              return property;
            })
            .collect(Collectors.toList());

          return beanModel.withProperties(properties);
        })
        .collect(Collectors.toList())
    );
  }
}
