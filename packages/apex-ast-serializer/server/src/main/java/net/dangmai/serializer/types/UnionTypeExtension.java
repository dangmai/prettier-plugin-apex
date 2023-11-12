package net.dangmai.serializer.types;

import cz.habarta.typescript.generator.Extension;
import cz.habarta.typescript.generator.compiler.ModelCompiler;
import cz.habarta.typescript.generator.compiler.ModelTransformer;
import cz.habarta.typescript.generator.compiler.SymbolTable;
import cz.habarta.typescript.generator.emitter.EmitterExtensionFeatures;
import cz.habarta.typescript.generator.parser.BeanModel;
import cz.habarta.typescript.generator.parser.Model;
import cz.habarta.typescript.generator.util.Utils;
import java.lang.reflect.Modifier;
import java.lang.reflect.Type;
import java.util.*;
import java.util.stream.Collectors;

/**
 * This class is used to generate union types for interfaces/abstract classes,
 * so that we can do exhaustive pattern matching in Typescript.
 */
public class UnionTypeExtension extends Extension {

  @Override
  public EmitterExtensionFeatures getFeatures() {
    return new EmitterExtensionFeatures();
  }

  @Override
  public List<Extension.TransformerDefinition> getTransformers() {
    return Arrays.asList(
      new Extension.TransformerDefinition(
        ModelCompiler.TransformationPhase.BeforeTsModel,
        new UnionTypeModelTransformer()
      )
    );
  }

  public static class UnionTypeModelTransformer implements ModelTransformer {

    // This method is copied straight from a private method in
    // typescript-generator
    private Map<Type, List<BeanModel>> createChildrenMap(Model model) {
      final Map<Type, List<BeanModel>> children = new LinkedHashMap<>();
      for (BeanModel bean : model.getBeans()) {
        for (Type ancestor : bean.getParentAndInterfaces()) {
          final Type processedAncestor = Utils.getRawClassOrNull(ancestor);
          if (!children.containsKey(processedAncestor)) {
            children.put(processedAncestor, new ArrayList<>());
          }
          children.get(processedAncestor).add(bean);
        }
      }
      return children;
    }

    // This method is adapted from a private method in typescript-generator
    private List<BeanModel> getDescendants(
      BeanModel bean,
      Map<Type, List<BeanModel>> children
    ) {
      final List<BeanModel> descendants = new ArrayList<>();
      final List<BeanModel> directDescendants = children.get(bean.getOrigin());
      if (directDescendants != null) {
        for (BeanModel descendant : directDescendants) {
          descendants.addAll(getDescendants(descendant, children));
        }
      }
      return descendants;
    }

    @Override
    public Model transformModel(SymbolTable symbolTable, Model model) {
      List<BeanModel> beans = model
        .getBeans()
        .stream()
        .map(bean -> {
          Class<?> originClass = bean.getOrigin();
          if (
            originClass.isInterface() ||
            Modifier.isAbstract(originClass.getModifiers())
          ) {
            List<Class<?>> descendents = getDescendants(
              bean,
              createChildrenMap(model)
            )
              .stream()
              .map(BeanModel::getClass)
              .collect(Collectors.toList());
            return new BeanModel(
              bean.getOrigin(),
              bean.getParent(),
              descendents,
              "@class",
              null,
              bean.getInterfaces(),
              bean.getProperties(),
              bean.getComments()
            );
          } else if (
            originClass.getInterfaces().length > 0 ||
            originClass.getSuperclass() != null
          ) {
            return new BeanModel(
              bean.getOrigin(),
              bean.getParent(),
              null,
              "@class",
              bean.getOrigin().getName(),
              bean.getInterfaces(),
              bean.getProperties(),
              bean.getComments()
            );
          }
          return bean;
        })
        .collect(Collectors.toList());

      return new Model(beans, model.getEnums(), model.getRestApplications());
    }
  }
}
