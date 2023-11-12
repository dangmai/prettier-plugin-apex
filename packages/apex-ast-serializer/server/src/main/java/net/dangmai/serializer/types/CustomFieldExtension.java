package net.dangmai.serializer.types;

import cz.habarta.typescript.generator.Extension;
import cz.habarta.typescript.generator.TsType;
import cz.habarta.typescript.generator.compiler.ModelCompiler;
import cz.habarta.typescript.generator.compiler.TsModelTransformer;
import cz.habarta.typescript.generator.emitter.EmitterExtensionFeatures;
import cz.habarta.typescript.generator.emitter.TsBeanModel;
import cz.habarta.typescript.generator.emitter.TsModifierFlags;
import cz.habarta.typescript.generator.emitter.TsPropertyModel;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * This class is used to add custom properties to the generated types
 */
public class CustomFieldExtension extends Extension {

  @Override
  public EmitterExtensionFeatures getFeatures() {
    return new EmitterExtensionFeatures();
  }

  @Override
  public List<TransformerDefinition> getTransformers() {
    return Arrays.asList(
      new TransformerDefinition(
        ModelCompiler.TransformationPhase.BeforeSymbolResolution,
        (TsModelTransformer) (context, model) ->
          model.withBeans(
            model
              .getBeans()
              .stream()
              .map(CustomFieldExtension.this::addCustomProperties)
              .collect(Collectors.toList())
          )
      )
    );
  }

  private TsBeanModel addCustomProperties(TsBeanModel bean) {
    Class<?> originClass = bean.getOrigin();
    List<TsPropertyModel> allProperties = bean.getProperties();
    if (!originClass.getName().startsWith("apex.jorje")) {
      return bean;
    }
    boolean isInterface = bean.getOrigin().isInterface();
    boolean isAbstract = Modifier.isAbstract(originClass.getModifiers());

    if (!isInterface && !isAbstract) {
      if (!bean.getDiscriminantProperty().equals("@class")) {
        // This property could already have been populated by the
        // union extension, so we will forego it in those cases
        allProperties.add(
          new TsPropertyModel(
            "@class",
            new TsType.StringLiteralType(bean.getOrigin().getName()),
            TsModifierFlags.None,
            true,
            null
          )
        );
      }
      allProperties.add(
        new TsPropertyModel(
          "@id",
          new TsType.OptionalType(TsType.String),
          TsModifierFlags.None,
          true,
          null
        )
      );
      allProperties.add(
        new TsPropertyModel(
          "@reference",
          new TsType.OptionalType(TsType.String),
          TsModifierFlags.None,
          true,
          null
        )
      );
    }
    return bean.withProperties(allProperties);
  }
}
