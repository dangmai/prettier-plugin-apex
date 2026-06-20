package net.dangmai.serializer.types;

import cz.habarta.typescript.generator.Extension;
import cz.habarta.typescript.generator.TsType;
import cz.habarta.typescript.generator.compiler.ModelCompiler;
import cz.habarta.typescript.generator.compiler.Symbol;
import cz.habarta.typescript.generator.compiler.TsModelTransformer;
import cz.habarta.typescript.generator.emitter.EmitterExtensionFeatures;
import cz.habarta.typescript.generator.emitter.TsAliasModel;
import cz.habarta.typescript.generator.emitter.TsBeanModel;
import cz.habarta.typescript.generator.emitter.TsModel;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Emits a discriminated-union alias of every concrete jorje node:
 *
 * <pre>export type ApexNode = ArrayExpr | BinaryExpr | ... ;</pre>
 *
 * Concrete nodes are exactly the beans the model compiler tagged with a single
 * "@class" discriminant literal; abstract parents carry a union of their
 * children's literals and have a null discriminant literal, so they're excluded.
 * The prettier-plugin-apex printer uses this union to type its
 * {@code @class -> handler} dispatch, which lets a newly generated jorje node
 * with no handler fail the TypeScript build rather than slip through at runtime.
 */
public class ApexNodeUnionExtension extends Extension {

  @Override
  public EmitterExtensionFeatures getFeatures() {
    return new EmitterExtensionFeatures();
  }

  @Override
  public List<TransformerDefinition> getTransformers() {
    return Arrays.asList(
      new TransformerDefinition(
        ModelCompiler.TransformationPhase.BeforeSymbolResolution,
        (TsModelTransformer) (context, model) -> addApexNodeUnion(model)
      )
    );
  }

  private TsModel addApexNodeUnion(TsModel tsModel) {
    List<TsType> members = tsModel
      .getBeans()
      .stream()
      .filter(bean -> bean.getDiscriminantLiteral() != null)
      // Sort by emitted name so the generated union is stable across runs.
      .sorted(
        Comparator.comparing((TsBeanModel bean) -> bean.getName().getSimpleName())
      )
      .map(bean -> (TsType) new TsType.ReferenceType(bean.getName()))
      .collect(Collectors.toList());

    TsAliasModel apexNode = new TsAliasModel(
      null,
      new Symbol("ApexNode"),
      null,
      new TsType.UnionType(members),
      null
    );

    return tsModel.withAddedTypeAliases(Collections.singletonList(apexNode));
  }
}
