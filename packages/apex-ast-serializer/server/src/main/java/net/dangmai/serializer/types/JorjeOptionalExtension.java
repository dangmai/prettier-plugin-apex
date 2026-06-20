package net.dangmai.serializer.types;

import cz.habarta.typescript.generator.TsProperty;
import cz.habarta.typescript.generator.TsType;
import cz.habarta.typescript.generator.Extension;
import cz.habarta.typescript.generator.compiler.ModelCompiler;
import cz.habarta.typescript.generator.compiler.Symbol;
import cz.habarta.typescript.generator.compiler.TsModelTransformer;
import cz.habarta.typescript.generator.emitter.EmitterExtensionFeatures;
import cz.habarta.typescript.generator.emitter.TsAliasModel;
import cz.habarta.typescript.generator.emitter.TsModel;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Declares the generic alias used to model jorje's {@code Optional<T>} fields:
 *
 * <pre>export type JorjeOptional&lt;T&gt; = { value?: T };</pre>
 *
 * The serializer emits an {@code Optional<T>} field as a wrapper object —
 * {@code {"value": …}} when present, {@code {}} when empty — but
 * typescript-generator's default handling unwraps it to a bare optional property
 * ({@code field?: T}), which doesn't match the runtime shape the printer reads
 * (`node.expr.value`). {@link CustomTypeProcessor}'s OptionalProcessor maps
 * {@code Optional<T>} to {@code JorjeOptional<T>} (referencing {@link #SYMBOL}),
 * and this extension emits the matching declaration.
 */
public class JorjeOptionalExtension extends Extension {

  /**
   * Shared so the reference created in {@link CustomTypeProcessor} and the
   * declaration added here are the same symbol instance, which keeps name
   * resolution consistent (no risk of one being renamed to avoid a collision).
   */
  public static final Symbol SYMBOL = new Symbol("JorjeOptional");

  private static final String TYPE_PARAMETER = "T";

  @Override
  public EmitterExtensionFeatures getFeatures() {
    return new EmitterExtensionFeatures();
  }

  @Override
  public List<TransformerDefinition> getTransformers() {
    return Arrays.asList(
      new TransformerDefinition(
        ModelCompiler.TransformationPhase.BeforeSymbolResolution,
        (TsModelTransformer) (context, model) -> addJorjeOptional(model)
      )
    );
  }

  private TsModel addJorjeOptional(TsModel tsModel) {
    TsType.GenericVariableType typeParameter = new TsType.GenericVariableType(
      TYPE_PARAMETER
    );
    TsType body = new TsType.ObjectType(
      new TsProperty("value", new TsType.OptionalType(typeParameter))
    );
    TsAliasModel jorjeOptional = new TsAliasModel(
      null,
      SYMBOL,
      Collections.singletonList(typeParameter),
      body,
      null
    );
    return tsModel.withAddedTypeAliases(
      Collections.singletonList(jorjeOptional)
    );
  }
}
