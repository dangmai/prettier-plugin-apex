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
import java.util.Map;
import java.util.stream.Collectors;

/**
 * This class is used to add custom properties to the generated types
 */
public class CustomFieldExtension extends Extension {

  // A few jorje nodes have a getter whose name doesn't match the field it reads,
  // so typescript-generator (which derives property names from getters) names the
  // TS property after the getter while the runtime serializer emits the field
  // name. We rename the TS property to match the wire format. Keyed by the origin
  // class name, mapping the generated (getter-derived) name to the field name.
  //
  // ParameterRef exposes its `typeRef` field through a `getType()` getter, so the
  // generator emits `type` but the serializer emits `typeRef`.
  private static final Map<String, Map<String, String>> PROPERTY_RENAMES = Map.of(
    "apex.jorje.data.ast.ParameterRef",
    Map.of("type", "typeRef")
  );

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

    Map<String, String> renames = PROPERTY_RENAMES.get(originClass.getName());
    if (renames != null) {
      allProperties =
        allProperties
          .stream()
          .map(property -> {
            String newName = renames.get(property.getName());
            if (newName == null) {
              return property;
            }
            return new TsPropertyModel(
              newName,
              property.tsType,
              property.decorators,
              property.modifiers,
              property.ownProperty,
              property.defaultValue,
              property.comments
            );
          })
          .collect(Collectors.toList());
    }
    return bean.withProperties(allProperties);
  }
}
