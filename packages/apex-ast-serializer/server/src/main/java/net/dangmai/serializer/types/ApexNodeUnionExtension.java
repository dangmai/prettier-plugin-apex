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
 * Members are the beans the model compiler tagged with a non-null "@class"
 * discriminant literal (their own concrete class name). Pure abstract parents
 * have a null literal and are excluded; note a concrete class that also has
 * concrete subclasses (e.g. java.lang.Exception) keeps a non-null literal even
 * though it emits a union "@class", so the literal — not the emitted shape — is
 * the signal.
 *
 * <p>The jorje discovery patterns also pull in non-AST types (Java stdlib
 * classes reached via field references like Throwable.cause, and jorje's own
 * exception classes). Those are filtered out by package here. A handful of
 * jorje-internal builders/factories under {@code apex.jorje.data} remain in the
 * union; telling them apart from real nodes would need fragile reachability
 * analysis, so they're excluded at the printer's dispatch denylist instead,
 * where a missed entry fails the build rather than silently dropping a node.
 *
 * <p>The prettier-plugin-apex printer uses this union to type its
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
      .filter(bean -> {
        String literal = bean.getDiscriminantLiteral();
        return (
          literal != null &&
          // Keep jorje types, drop Java stdlib classes (Throwable, etc.)...
          literal.startsWith("apex.jorje.") &&
          // ...and jorje's exception classes — none are AST nodes.
          !literal.startsWith("apex.jorje.services.exception.")
        );
      })
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
