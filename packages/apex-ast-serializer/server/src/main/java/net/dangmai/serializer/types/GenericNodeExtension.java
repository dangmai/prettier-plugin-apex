package net.dangmai.serializer.types;

import cz.habarta.typescript.generator.Extension;
import cz.habarta.typescript.generator.TsType;
import cz.habarta.typescript.generator.compiler.ModelCompiler;
import cz.habarta.typescript.generator.compiler.Symbol;
import cz.habarta.typescript.generator.compiler.TsModelTransformer;
import cz.habarta.typescript.generator.emitter.*;
import java.util.Arrays;
import java.util.List;

public class GenericNodeExtension extends Extension {

  @Override
  public EmitterExtensionFeatures getFeatures() {
    return new EmitterExtensionFeatures();
  }

  @Override
  public List<TransformerDefinition> getTransformers() {
    return Arrays.asList(
      new TransformerDefinition(
        ModelCompiler.TransformationPhase.BeforeSymbolResolution,
        (TsModelTransformer) (context, model) -> addGenericNode(model)
      )
    );
  }

  private TsModel addGenericNode(TsModel tsModel) {
    final List<TsBeanModel> beanModels = tsModel.getBeans();

    TsBeanModel genericNode = new TsBeanModel(
      null,
      TsBeanCategory.Data,
      false,
      new Symbol("AstNode"),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    )
      .withTaggedUnionAlias(
        new TsAliasModel(
          null,
          new Symbol("AstAlias"),
          Arrays.asList(new TsType.GenericVariableType("Hello")),
          TsType.Boolean,
          null
        )
      );
    beanModels.add(genericNode);
    return tsModel.withBeans(beanModels);
  }
}
