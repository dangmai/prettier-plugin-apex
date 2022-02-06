/* tslint:disable */
/* eslint-disable */

export interface AbstractModifier extends Modifier {
    "@class": "apex.jorje.data.ast.Modifier$AbstractModifier";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface Annotation extends Modifier {
    "@class": "apex.jorje.data.ast.Modifier$Annotation";
    loc: Location;
    name: Identifier;
    parameters: AnnotationParameter[];
    "@id"?: string;
    "@reference"?: string;
}

export interface AnnotationKeyValue extends AnnotationParameter {
    "@class": "apex.jorje.data.ast.AnnotationParameter$AnnotationKeyValue";
    key: Identifier;
    loc: Location;
    value: AnnotationValue;
    "@id"?: string;
    "@reference"?: string;
}

export interface AnnotationParameter {
    "@class": "apex.jorje.data.ast.AnnotationParameter$AnnotationKeyValue" | "apex.jorje.data.ast.AnnotationParameter$AnnotationString";
}

export interface AnnotationString extends AnnotationParameter {
    "@class": "apex.jorje.data.ast.AnnotationParameter$AnnotationString";
    loc: Location;
    value: string;
    "@id"?: string;
    "@reference"?: string;
}

export interface AnnotationValue {
    "@class": "apex.jorje.data.ast.AnnotationValue$FalseAnnotationValue" | "apex.jorje.data.ast.AnnotationValue$StringAnnotationValue" | "apex.jorje.data.ast.AnnotationValue$TrueAnnotationValue";
}

export interface AnonymousBlockUnit extends CompilationUnit {
    "@class": "apex.jorje.data.ast.CompilationUnit$AnonymousBlockUnit";
    members: BlockMember[];
    "@id"?: string;
    "@reference"?: string;
}

export interface ApexExpr extends QueryExpr {
    "@class": "apex.jorje.data.soql.QueryExpr$ApexExpr";
    expr: ColonExpr;
    "@id"?: string;
    "@reference"?: string;
}

export interface ArrayExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$ArrayExpr";
    expr: Expr;
    index: Expr;
    "@id"?: string;
    "@reference"?: string;
}

export interface ArrayTypeRef extends TypeRef {
    "@class": "apex.jorje.data.ast.TypeRefs$ArrayTypeRef";
    heldType: TypeRef;
    "@id"?: string;
    "@reference"?: string;
}

export interface AssignmentExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$AssignmentExpr";
    left: Expr;
    op: { $: AssignmentOp; "@class": "apex.jorje.data.ast.AssignmentOp"; };
    right: Expr;
    "@id"?: string;
    "@reference"?: string;
}

export interface AstNode {
}

export interface BinaryExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$BinaryExpr";
    left: Expr;
    op: { $: BinaryOp; "@class": "apex.jorje.data.ast.BinaryOp"; };
    right: Expr;
    "@id"?: string;
    "@reference"?: string;
}

export interface BindClause {
    "@class": "apex.jorje.data.soql.BindClause";
    exprs: BindExpr[];
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface BindExpr {
    "@class": "apex.jorje.data.soql.BindExpr";
    field: FieldIdentifier;
    value: QueryLiteral;
    "@id"?: string;
    "@reference"?: string;
}

export interface BlockComment extends HiddenToken {
    "@class": "apex.jorje.parser.impl.HiddenTokens$BlockComment";
    "@id"?: string;
    "@reference"?: string;
}

export interface BlockMember {
    "@class": "apex.jorje.data.ast.BlockMember$FieldMember" | "apex.jorje.data.ast.BlockMember$InnerClassMember" | "apex.jorje.data.ast.BlockMember$InnerEnumMember" | "apex.jorje.data.ast.BlockMember$InnerInterfaceMember" | "apex.jorje.data.ast.BlockMember$MethodMember" | "apex.jorje.data.ast.BlockMember$PropertyMember" | "apex.jorje.data.ast.BlockMember$StaticStmntBlockMember" | "apex.jorje.data.ast.BlockMember$StmntBlockMember";
}

export interface BlockStmnt extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$BlockStmnt";
    loc: Location;
    stmnts: Stmnt[];
    "@id"?: string;
    "@reference"?: string;
}

export interface BooleanExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$BooleanExpr";
    left: Expr;
    op: { $: BooleanOp; "@class": "apex.jorje.data.ast.BooleanOp"; };
    right: Expr;
    "@id"?: string;
    "@reference"?: string;
}

export interface BooleanKeyValue extends WithKeyValue {
    "@class": "apex.jorje.data.soql.WithKeyValue$BooleanKeyValue";
    identifier: Identifier;
    value: boolean;
    "@id"?: string;
    "@reference"?: string;
}

export interface BreakStmnt extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$BreakStmnt";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface CStyleForControl extends ForControl {
    "@class": "apex.jorje.data.ast.ForControl$CStyleForControl";
    condition?: Expr;
    control?: Expr;
    inits?: ForInits;
    "@id"?: string;
    "@reference"?: string;
}

export interface CaseExpr {
    "@class": "apex.jorje.data.soql.CaseExpr";
    elseBranch?: ElseExpr;
    loc: Location;
    op: CaseOp;
    whenBranches: WhenExpr[];
    "@id"?: string;
    "@reference"?: string;
}

export interface CaseOp {
    "@class": "apex.jorje.data.soql.CaseOp";
    identifier: FieldIdentifier;
    "@id"?: string;
    "@reference"?: string;
}

export interface CastExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$CastExpr";
    expr: Expr;
    loc: Location;
    type: TypeRef;
    "@id"?: string;
    "@reference"?: string;
}

export interface CatchBlock {
    "@class": "apex.jorje.data.ast.CatchBlock";
    loc: Location;
    parameter: ParameterRef;
    stmnt: Stmnt;
    "@id"?: string;
    "@reference"?: string;
}

export interface ClassDecl {
    "@class": "apex.jorje.data.ast.ClassDecl";
    interfaces: TypeRef[];
    loc: Location;
    members: BlockMember[];
    modifiers: Modifier[];
    name: Identifier;
    superClass?: TypeRef;
    typeArguments?: Identifier[];
    "@id"?: string;
    "@reference"?: string;
}

export interface ClassDeclUnit extends CompilationUnit {
    "@class": "apex.jorje.data.ast.CompilationUnit$ClassDeclUnit";
    body: ClassDecl;
    "@id"?: string;
    "@reference"?: string;
}

export interface ClassRefExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$ClassRefExpr";
    loc: Location;
    type: TypeRef;
    "@id"?: string;
    "@reference"?: string;
}

export interface ClassTypeRef extends TypeRef {
    "@class": "apex.jorje.data.ast.TypeRefs$ClassTypeRef";
    "@id"?: string;
    "@reference"?: string;
}

export interface ColonExpr {
    "@class": "apex.jorje.data.soql.ColonExpr";
    expr: Expr;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface CompilationException extends RuntimeException, Locatable {
    "@class": "apex.jorje.services.exception.InternalException" | "apex.jorje.services.exception.ParseException";
    error: string;
}

export interface CompilationUnit {
    "@class": "apex.jorje.data.ast.CompilationUnit$AnonymousBlockUnit" | "apex.jorje.data.ast.CompilationUnit$ClassDeclUnit" | "apex.jorje.data.ast.CompilationUnit$EnumDeclUnit" | "apex.jorje.data.ast.CompilationUnit$InterfaceDeclUnit" | "apex.jorje.data.ast.CompilationUnit$InvalidDeclUnit" | "apex.jorje.data.ast.CompilationUnit$TriggerDeclUnit";
}

export interface CompilationUnitBuilder {
    "@class": "apex.jorje.data.CompilationUnitBuilder";
    "@id"?: string;
    "@reference"?: string;
}

export interface ContinueStmnt extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$ContinueStmnt";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface DataCategory {
    "@class": "apex.jorje.data.soql.DataCategory";
    categories: FieldIdentifier[];
    op: DataCategoryOperator;
    type: FieldIdentifier;
    "@id"?: string;
    "@reference"?: string;
}

export interface DataCategoryAbove extends DataCategoryOperator {
    "@class": "apex.jorje.data.soql.DataCategoryOperator$DataCategoryAbove";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface DataCategoryAboveOrBelow extends DataCategoryOperator {
    "@class": "apex.jorje.data.soql.DataCategoryOperator$DataCategoryAboveOrBelow";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface DataCategoryAt extends DataCategoryOperator {
    "@class": "apex.jorje.data.soql.DataCategoryOperator$DataCategoryAt";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface DataCategoryBelow extends DataCategoryOperator {
    "@class": "apex.jorje.data.soql.DataCategoryOperator$DataCategoryBelow";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface DataCategoryOperator {
    "@class": "apex.jorje.data.soql.DataCategoryOperator$DataCategoryAbove" | "apex.jorje.data.soql.DataCategoryOperator$DataCategoryAboveOrBelow" | "apex.jorje.data.soql.DataCategoryOperator$DataCategoryAt" | "apex.jorje.data.soql.DataCategoryOperator$DataCategoryBelow";
}

export interface DistanceFunctionExpr {
    "@class": "apex.jorje.data.soql.DistanceFunctionExpr";
    field: FieldIdentifier;
    loc: Location;
    location: Geolocation;
    unit: string;
    "@id"?: string;
    "@reference"?: string;
}

export interface DivisionExpr extends DivisionValue {
    "@class": "apex.jorje.data.sosl.DivisionValue$DivisionExpr";
    expr: ColonExpr;
    "@id"?: string;
    "@reference"?: string;
}

export interface DivisionLiteral extends DivisionValue {
    "@class": "apex.jorje.data.sosl.DivisionValue$DivisionLiteral";
    literal: string;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface DivisionValue {
    "@class": "apex.jorje.data.sosl.DivisionValue$DivisionExpr" | "apex.jorje.data.sosl.DivisionValue$DivisionLiteral";
}

export interface DmlDeleteStmnt extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$DmlDeleteStmnt";
    expr: Expr;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface DmlInsertStmnt extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$DmlInsertStmnt";
    expr: Expr;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface DmlMergeStmnt extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$DmlMergeStmnt";
    expr1: Expr;
    expr2: Expr;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface DmlUndeleteStmnt extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$DmlUndeleteStmnt";
    expr: Expr;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface DmlUpdateStmnt extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$DmlUpdateStmnt";
    expr: Expr;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface DmlUpsertStmnt extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$DmlUpsertStmnt";
    expr: Expr;
    id?: FieldIdentifier;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface DoLoop extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$DoLoop";
    condition: Expr;
    loc: Location;
    stmnt: Stmnt;
    "@id"?: string;
    "@reference"?: string;
}

export interface ElseBlock {
    "@class": "apex.jorje.data.ast.ElseBlock";
    loc: Location;
    stmnt: Stmnt;
    "@id"?: string;
    "@reference"?: string;
}

export interface ElseExpr {
    "@class": "apex.jorje.data.soql.ElseExpr";
    identifiers: FieldIdentifier[];
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface ElseWhen extends WhenBlock {
    "@class": "apex.jorje.data.ast.WhenBlock$ElseWhen";
    stmnt: Stmnt;
    "@id"?: string;
    "@reference"?: string;
}

export interface EmptyModifierParameterRef extends ParameterRef {
    "@class": "apex.jorje.data.ast.ParameterRefs$EmptyModifierParameterRef";
    "@id"?: string;
    "@reference"?: string;
}

export interface EnhancedForControl extends ForControl {
    "@class": "apex.jorje.data.ast.ForControl$EnhancedForControl";
    init: ForInit;
    type: TypeRef;
    "@id"?: string;
    "@reference"?: string;
}

export interface EnumCase extends WhenCase {
    "@class": "apex.jorje.data.ast.WhenCase$EnumCase";
    identifiers: Identifier[];
    "@id"?: string;
    "@reference"?: string;
}

export interface EnumDecl {
    "@class": "apex.jorje.data.ast.EnumDecl";
    loc: Location;
    members: Identifier[];
    modifiers: Modifier[];
    name: Identifier;
    "@id"?: string;
    "@reference"?: string;
}

export interface EnumDeclUnit extends CompilationUnit {
    "@class": "apex.jorje.data.ast.CompilationUnit$EnumDeclUnit";
    body: EnumDecl;
    "@id"?: string;
    "@reference"?: string;
}

export interface Exception extends Throwable {
    "@class": "java.lang.Exception" | "java.lang.RuntimeException" | "apex.jorje.services.exception.InternalException" | "apex.jorje.services.exception.ParseException";
}

export interface Expr {
    "@class": "apex.jorje.data.ast.Expr$ArrayExpr" | "apex.jorje.data.ast.Expr$AssignmentExpr" | "apex.jorje.data.ast.Expr$BinaryExpr" | "apex.jorje.data.ast.Expr$BooleanExpr" | "apex.jorje.data.ast.Expr$CastExpr" | "apex.jorje.data.ast.Expr$ClassRefExpr" | "apex.jorje.data.ast.Expr$InstanceOf" | "apex.jorje.data.ast.Expr$JavaMethodCallExpr" | "apex.jorje.data.ast.Expr$JavaVariableExpr" | "apex.jorje.data.ast.Expr$LiteralExpr" | "apex.jorje.data.ast.Expr$MethodCallExpr" | "apex.jorje.data.ast.Expr$NestedExpr" | "apex.jorje.data.ast.Expr$NewExpr" | "apex.jorje.data.ast.Expr$PackageVersionExpr" | "apex.jorje.data.ast.Expr$PostfixExpr" | "apex.jorje.data.ast.Expr$PrefixExpr" | "apex.jorje.data.ast.Expr$SoqlExpr" | "apex.jorje.data.ast.Expr$SoslExpr" | "apex.jorje.data.ast.Expr$SuperMethodCallExpr" | "apex.jorje.data.ast.Expr$SuperVariableExpr" | "apex.jorje.data.ast.Expr$TernaryExpr" | "apex.jorje.data.ast.Expr$ThisMethodCallExpr" | "apex.jorje.data.ast.Expr$ThisVariableExpr" | "apex.jorje.data.ast.Expr$TriggerVariableExpr" | "apex.jorje.data.ast.Expr$VariableExpr";
}

export interface ExprLiteralExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$LiteralExpr";
    literal: any;
    loc: Location;
    type: { $: LiteralType; "@class": "apex.jorje.data.ast.LiteralType"; };
    "@id"?: string;
    "@reference"?: string;
}

export interface ExpressionStmnt extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$ExpressionStmnt";
    expr: Expr;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface FalseAnnotationValue extends AnnotationValue {
    "@class": "apex.jorje.data.ast.AnnotationValue$FalseAnnotationValue";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface Field {
    "@class": "apex.jorje.data.soql.Field";
    field: FieldIdentifier;
    function1?: Identifier;
    function2?: Identifier;
    "@id"?: string;
    "@reference"?: string;
}

export interface FieldIdentifier {
    "@class": "apex.jorje.data.soql.FieldIdentifier";
    entity?: FieldIdentifier;
    field: Identifier;
    "@id"?: string;
    "@reference"?: string;
}

export interface FieldMember extends BlockMember {
    "@class": "apex.jorje.data.ast.BlockMember$FieldMember";
    variableDecls: VariableDecls;
    "@id"?: string;
    "@reference"?: string;
}

export interface FinalModifier extends Modifier {
    "@class": "apex.jorje.data.ast.Modifier$FinalModifier";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface FinallyBlock {
    "@class": "apex.jorje.data.ast.FinallyBlock";
    loc: Location;
    stmnt: Stmnt;
    "@id"?: string;
    "@reference"?: string;
}

export interface FindClause {
    "@class": "apex.jorje.data.sosl.FindClause";
    loc: Location;
    search: FindValue;
    "@id"?: string;
    "@reference"?: string;
}

export interface FindExpr extends FindValue {
    "@class": "apex.jorje.data.sosl.FindValue$FindExpr";
    expr: ColonExpr;
    "@id"?: string;
    "@reference"?: string;
}

export interface FindString extends FindValue {
    "@class": "apex.jorje.data.sosl.FindValue$FindString";
    value: string;
    "@id"?: string;
    "@reference"?: string;
}

export interface FindValue {
    "@class": "apex.jorje.data.sosl.FindValue$FindExpr" | "apex.jorje.data.sosl.FindValue$FindString";
}

export interface ForControl {
    "@class": "apex.jorje.data.ast.ForControl$CStyleForControl" | "apex.jorje.data.ast.ForControl$EnhancedForControl";
}

export interface ForInit {
    "@class": "apex.jorje.data.ast.ForInit";
    expr?: Expr;
    name: Identifier[];
    "@id"?: string;
    "@reference"?: string;
}

export interface ForInits {
    "@class": "apex.jorje.data.ast.ForInits";
    inits: ForInit[];
    type?: TypeRef;
    "@id"?: string;
    "@reference"?: string;
}

export interface ForLoop extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$ForLoop";
    forControl: ForControl;
    loc: Location;
    stmnt?: Stmnt;
    "@id"?: string;
    "@reference"?: string;
}

export interface ForReference extends TrackingType {
    "@class": "apex.jorje.data.soql.TrackingType$ForReference";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface ForView extends TrackingType {
    "@class": "apex.jorje.data.soql.TrackingType$ForView";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface FromClause {
    "@class": "apex.jorje.data.soql.FromClause";
    exprs: FromExpr[];
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface FromExpr {
    "@class": "apex.jorje.data.soql.FromExpr";
    alias?: Identifier;
    table: FieldIdentifier;
    using?: QueryUsingClause;
    "@id"?: string;
    "@reference"?: string;
}

export interface Geolocation {
    "@class": "apex.jorje.data.soql.Geolocation$GeolocationExpr" | "apex.jorje.data.soql.Geolocation$GeolocationLiteral";
}

export interface GeolocationExpr extends Geolocation {
    "@class": "apex.jorje.data.soql.Geolocation$GeolocationExpr";
    expr: ColonExpr;
    "@id"?: string;
    "@reference"?: string;
}

export interface GeolocationLiteral extends Geolocation {
    "@class": "apex.jorje.data.soql.Geolocation$GeolocationLiteral";
    latitude: NumberClause;
    longitude: NumberClause;
    "@id"?: string;
    "@reference"?: string;
}

export interface GlobalModifier extends Modifier {
    "@class": "apex.jorje.data.ast.Modifier$GlobalModifier";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface GroupByClause {
    "@class": "apex.jorje.data.soql.GroupByClause";
    exprs: GroupByExpr[];
    having?: HavingClause;
    loc: Location;
    type?: GroupByType;
    "@id"?: string;
    "@reference"?: string;
}

export interface GroupByCube extends GroupByType {
    "@class": "apex.jorje.data.soql.GroupByType$GroupByCube";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface GroupByExpr {
    "@class": "apex.jorje.data.soql.GroupByExpr";
    field: Field;
    "@id"?: string;
    "@reference"?: string;
}

export interface GroupByRollUp extends GroupByType {
    "@class": "apex.jorje.data.soql.GroupByType$GroupByRollUp";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface GroupByType {
    "@class": "apex.jorje.data.soql.GroupByType$GroupByCube" | "apex.jorje.data.soql.GroupByType$GroupByRollUp";
}

export interface HavingClause {
    "@class": "apex.jorje.data.soql.HavingClause";
    expr: WhereExpr;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface HiddenToken {
    "@class": "apex.jorje.parser.impl.HiddenTokens$BlockComment" | "apex.jorje.parser.impl.HiddenTokens$InlineComment";
    location: Location;
    value: string;
}

export interface HiddenTokens {
    "@class": "apex.jorje.parser.impl.HiddenTokens";
    "@id"?: string;
    "@reference"?: string;
}

export interface Identifier extends Locatable {
    "@class": "apex.jorje.data.Identifiers$LocationIdentifier" | "apex.jorje.data.Identifiers$SyntheticIdentifier";
    value: string;
}

export interface Identifiers {
    "@class": "apex.jorje.data.Identifiers";
    "@id"?: string;
    "@reference"?: string;
}

export interface IfBlock {
    "@class": "apex.jorje.data.ast.IfBlock";
    expr: Expr;
    loc: Location;
    stmnt: Stmnt;
    "@id"?: string;
    "@reference"?: string;
}

export interface IfElseBlock extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$IfElseBlock";
    elseBlock?: ElseBlock;
    ifBlocks: IfBlock[];
    "@id"?: string;
    "@reference"?: string;
}

export interface IllegalDecimalLiteral extends SyntaxError {
    "@class": "apex.jorje.data.errors.SyntaxError$IllegalDecimalLiteral";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface IllegalDoubleLiteral extends SyntaxError {
    "@class": "apex.jorje.data.errors.SyntaxError$IllegalDoubleLiteral";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface IllegalIntegerLiteral extends SyntaxError {
    "@class": "apex.jorje.data.errors.SyntaxError$IllegalIntegerLiteral";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface IllegalLongLiteral extends SyntaxError {
    "@class": "apex.jorje.data.errors.SyntaxError$IllegalLongLiteral";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface IllegalStringLiteral extends SyntaxError {
    "@class": "apex.jorje.data.errors.SyntaxError$IllegalStringLiteral";
    loc: Location;
    message: string;
    "@id"?: string;
    "@reference"?: string;
}

export interface InClause {
    "@class": "apex.jorje.data.sosl.InClause";
    loc: Location;
    scope: string;
    "@id"?: string;
    "@reference"?: string;
}

export interface IncludeDeleted extends QueryOption {
    "@class": "apex.jorje.data.soql.QueryOption$IncludeDeleted";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface IndexLocation extends Location {
    "@class": "apex.jorje.data.IndexLocation";
    "@id"?: string;
    "@reference"?: string;
}

export interface InheritedSharingModifier extends Modifier {
    "@class": "apex.jorje.data.ast.Modifier$InheritedSharingModifier";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface InlineComment extends HiddenToken {
    "@class": "apex.jorje.parser.impl.HiddenTokens$InlineComment";
    "@id"?: string;
    "@reference"?: string;
}

export interface InnerClassMember extends BlockMember {
    "@class": "apex.jorje.data.ast.BlockMember$InnerClassMember";
    body: ClassDecl;
    "@id"?: string;
    "@reference"?: string;
}

export interface InnerEnumMember extends BlockMember {
    "@class": "apex.jorje.data.ast.BlockMember$InnerEnumMember";
    body: EnumDecl;
    "@id"?: string;
    "@reference"?: string;
}

export interface InnerInterfaceMember extends BlockMember {
    "@class": "apex.jorje.data.ast.BlockMember$InnerInterfaceMember";
    body: InterfaceDecl;
    "@id"?: string;
    "@reference"?: string;
}

export interface InstanceOf extends Expr {
    "@class": "apex.jorje.data.ast.Expr$InstanceOf";
    expr: Expr;
    type: TypeRef;
    "@id"?: string;
    "@reference"?: string;
}

export interface InterfaceDecl {
    "@class": "apex.jorje.data.ast.InterfaceDecl";
    loc: Location;
    members: BlockMember[];
    modifiers: Modifier[];
    name: Identifier;
    superInterface?: TypeRef;
    typeArguments?: Identifier[];
    "@id"?: string;
    "@reference"?: string;
}

export interface InterfaceDeclUnit extends CompilationUnit {
    "@class": "apex.jorje.data.ast.CompilationUnit$InterfaceDeclUnit";
    body: InterfaceDecl;
    "@id"?: string;
    "@reference"?: string;
}

export interface InternalException extends CompilationException {
    "@class": "apex.jorje.services.exception.InternalException";
    "@id"?: string;
    "@reference"?: string;
}

export interface InvalidControlChar extends LexicalError {
    "@class": "apex.jorje.data.errors.LexicalError$InvalidControlChar";
    character: string;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface InvalidDate extends LexicalError {
    "@class": "apex.jorje.data.errors.LexicalError$InvalidDate";
    date: string;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface InvalidDateTime extends LexicalError {
    "@class": "apex.jorje.data.errors.LexicalError$InvalidDateTime";
    dateTime: string;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface InvalidDeclUnit extends CompilationUnit {
    "@class": "apex.jorje.data.ast.CompilationUnit$InvalidDeclUnit";
    "@id"?: string;
    "@reference"?: string;
}

export interface InvalidIdentifier extends LexicalError {
    "@class": "apex.jorje.data.errors.LexicalError$InvalidIdentifier";
    identifier: string;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface InvalidSymbol extends LexicalError {
    "@class": "apex.jorje.data.errors.LexicalError$InvalidSymbol";
    loc: Location;
    symbol: string;
    "@id"?: string;
    "@reference"?: string;
}

export interface InvalidTime extends LexicalError {
    "@class": "apex.jorje.data.errors.LexicalError$InvalidTime";
    loc: Location;
    time: string;
    "@id"?: string;
    "@reference"?: string;
}

export interface JadtTester {
    "@class": "apex.jorje.data.JadtTester";
    "@id"?: string;
    "@reference"?: string;
}

export interface JavaMethodCallExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$JavaMethodCallExpr";
    inputParameters: Expr[];
    loc: Location;
    names: Identifier[];
    "@id"?: string;
    "@reference"?: string;
}

export interface JavaTypeRef extends TypeRef {
    "@class": "apex.jorje.data.ast.TypeRefs$JavaTypeRef";
    "@id"?: string;
    "@reference"?: string;
}

export interface JavaVariableExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$JavaVariableExpr";
    loc: Location;
    names: Identifier[];
    "@id"?: string;
    "@reference"?: string;
}

export interface Lexical extends UserError {
    "@class": "apex.jorje.data.errors.UserError$Lexical";
    error: LexicalError;
    "@id"?: string;
    "@reference"?: string;
}

export interface LexicalError {
    "@class": "apex.jorje.data.errors.LexicalError$InvalidControlChar" | "apex.jorje.data.errors.LexicalError$InvalidDate" | "apex.jorje.data.errors.LexicalError$InvalidDateTime" | "apex.jorje.data.errors.LexicalError$InvalidIdentifier" | "apex.jorje.data.errors.LexicalError$InvalidSymbol" | "apex.jorje.data.errors.LexicalError$InvalidTime" | "apex.jorje.data.errors.LexicalError$SymbolInUnexpectedSet" | "apex.jorje.data.errors.LexicalError$SymbolNotInExpectedSet" | "apex.jorje.data.errors.LexicalError$SymbolNotInRange" | "apex.jorje.data.errors.LexicalError$UnexpectedLexicalError" | "apex.jorje.data.errors.LexicalError$UnexpectedSymbol" | "apex.jorje.data.errors.LexicalError$UnrecognizedSymbol" | "apex.jorje.data.errors.LexicalError$UnterminatedComment" | "apex.jorje.data.errors.LexicalError$UnterminatedString";
}

export interface LimitClause {
    "@class": "apex.jorje.data.soql.LimitClause$LimitExpr" | "apex.jorje.data.soql.LimitClause$LimitValue";
}

export interface LimitExpr extends LimitClause {
    "@class": "apex.jorje.data.soql.LimitClause$LimitExpr";
    expr: ColonExpr;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface LimitValue extends LimitClause {
    "@class": "apex.jorje.data.soql.LimitClause$LimitValue";
    i: number;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface LiteralCase extends WhenCase {
    "@class": "apex.jorje.data.ast.WhenCase$LiteralCase";
    expr: Expr;
    "@id"?: string;
    "@reference"?: string;
}

export interface Locatable {
    "@class": "apex.jorje.data.Identifiers$LocationIdentifier" | "apex.jorje.data.Identifiers$SyntheticIdentifier" | "apex.jorje.data.IndexLocation" | "apex.jorje.data.PositionLocation" | "apex.jorje.services.exception.InternalException" | "apex.jorje.services.exception.ParseException";
    loc: Location;
}

export interface Locatables {
    "@class": "apex.jorje.data.Locatables";
    "@id"?: string;
    "@reference"?: string;
}

export interface Location extends Locatable {
    "@class": "apex.jorje.data.IndexLocation" | "apex.jorje.data.PositionLocation";
    column: number;
    endIndex: number;
    line: number;
    startIndex: number;
}

export interface LocationBlocks {
    "@class": "apex.jorje.data.LocationBlocks";
    "@id"?: string;
    "@reference"?: string;
}

export interface LocationIdentifier extends Identifier {
    "@class": "apex.jorje.data.Identifiers$LocationIdentifier";
    "@id"?: string;
    "@reference"?: string;
}

export interface Locations {
    "@class": "apex.jorje.data.Locations";
    "@id"?: string;
    "@reference"?: string;
}

export interface LockRows extends QueryOption {
    "@class": "apex.jorje.data.soql.QueryOption$LockRows";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface MapLiteralKeyValue {
    "@class": "apex.jorje.data.ast.MapLiteralKeyValue";
    key: Expr;
    value: Expr;
    "@id"?: string;
    "@reference"?: string;
}

export interface MethodCallExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$MethodCallExpr";
    dottedExpr?: Expr;
    inputParameters: Expr[];
    isSafeNav: boolean;
    names: Identifier[];
    "@id"?: string;
    "@reference"?: string;
}

export interface MethodDecl {
    "@class": "apex.jorje.data.ast.MethodDecl";
    modifiers: Modifier[];
    name: Identifier;
    parameters: ParameterRef[];
    stmnt?: Stmnt;
    type?: TypeRef;
    "@id"?: string;
    "@reference"?: string;
}

export interface MethodMember extends BlockMember {
    "@class": "apex.jorje.data.ast.BlockMember$MethodMember";
    methodDecl: MethodDecl;
    "@id"?: string;
    "@reference"?: string;
}

export interface MismatchedSyntax extends SyntaxError {
    "@class": "apex.jorje.data.errors.SyntaxError$MismatchedSyntax";
    actual: string;
    expected: string;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface MissingSyntax extends SyntaxError {
    "@class": "apex.jorje.data.errors.SyntaxError$MissingSyntax";
    actual: string;
    expected: string;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface Modifier {
    "@class": "apex.jorje.data.ast.Modifier$AbstractModifier" | "apex.jorje.data.ast.Modifier$Annotation" | "apex.jorje.data.ast.Modifier$FinalModifier" | "apex.jorje.data.ast.Modifier$GlobalModifier" | "apex.jorje.data.ast.Modifier$InheritedSharingModifier" | "apex.jorje.data.ast.Modifier$OverrideModifier" | "apex.jorje.data.ast.Modifier$PrivateModifier" | "apex.jorje.data.ast.Modifier$ProtectedModifier" | "apex.jorje.data.ast.Modifier$PublicModifier" | "apex.jorje.data.ast.Modifier$StaticModifier" | "apex.jorje.data.ast.Modifier$TestMethodModifier" | "apex.jorje.data.ast.Modifier$TransientModifier" | "apex.jorje.data.ast.Modifier$VirtualModifier" | "apex.jorje.data.ast.Modifier$WebServiceModifier" | "apex.jorje.data.ast.Modifier$WithSharingModifier" | "apex.jorje.data.ast.Modifier$WithoutSharingModifier";
}

export interface ModifierParameterRef extends ParameterRef {
    "@class": "apex.jorje.data.ast.ParameterRefs$ModifierParameterRef";
    "@id"?: string;
    "@reference"?: string;
}

export interface NameValueParameter {
    "@class": "apex.jorje.data.ast.NameValueParameter";
    name: Identifier;
    value: Expr;
    "@id"?: string;
    "@reference"?: string;
}

export interface NestedExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$NestedExpr";
    expr: Expr;
    "@id"?: string;
    "@reference"?: string;
}

export interface NewExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$NewExpr";
    creator: NewObject;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface NewKeyValue extends NewObject {
    "@class": "apex.jorje.data.ast.NewObject$NewKeyValue";
    keyValues: NameValueParameter[];
    type: TypeRef;
    "@id"?: string;
    "@reference"?: string;
}

export interface NewListInit extends NewObject {
    "@class": "apex.jorje.data.ast.NewObject$NewListInit";
    expr?: Expr;
    types: TypeRef[];
    "@id"?: string;
    "@reference"?: string;
}

export interface NewListLiteral extends NewObject {
    "@class": "apex.jorje.data.ast.NewObject$NewListLiteral";
    types: TypeRef[];
    values: Expr[];
    "@id"?: string;
    "@reference"?: string;
}

export interface NewMapInit extends NewObject {
    "@class": "apex.jorje.data.ast.NewObject$NewMapInit";
    expr?: Expr;
    types: TypeRef[];
    "@id"?: string;
    "@reference"?: string;
}

export interface NewMapLiteral extends NewObject {
    "@class": "apex.jorje.data.ast.NewObject$NewMapLiteral";
    pairs: MapLiteralKeyValue[];
    types: TypeRef[];
    "@id"?: string;
    "@reference"?: string;
}

export interface NewObject {
    "@class": "apex.jorje.data.ast.NewObject$NewKeyValue" | "apex.jorje.data.ast.NewObject$NewListInit" | "apex.jorje.data.ast.NewObject$NewListLiteral" | "apex.jorje.data.ast.NewObject$NewMapInit" | "apex.jorje.data.ast.NewObject$NewMapLiteral" | "apex.jorje.data.ast.NewObject$NewSetInit" | "apex.jorje.data.ast.NewObject$NewSetLiteral" | "apex.jorje.data.ast.NewObject$NewStandard";
}

export interface NewSetInit extends NewObject {
    "@class": "apex.jorje.data.ast.NewObject$NewSetInit";
    expr?: Expr;
    types: TypeRef[];
    "@id"?: string;
    "@reference"?: string;
}

export interface NewSetLiteral extends NewObject {
    "@class": "apex.jorje.data.ast.NewObject$NewSetLiteral";
    types: TypeRef[];
    values: Expr[];
    "@id"?: string;
    "@reference"?: string;
}

export interface NewStandard extends NewObject {
    "@class": "apex.jorje.data.ast.NewObject$NewStandard";
    inputParameters: Expr[];
    type: TypeRef;
    "@id"?: string;
    "@reference"?: string;
}

export interface NumberClause {
    "@class": "apex.jorje.data.soql.NumberClause$NumberExpr" | "apex.jorje.data.soql.NumberClause$NumberLiteral";
}

export interface NumberExpr extends NumberClause {
    "@class": "apex.jorje.data.soql.NumberClause$NumberExpr";
    expr: ColonExpr;
    "@id"?: string;
    "@reference"?: string;
}

export interface NumberKeyValue extends WithKeyValue {
    "@class": "apex.jorje.data.soql.WithKeyValue$NumberKeyValue";
    identifier: Identifier;
    value: number;
    "@id"?: string;
    "@reference"?: string;
}

export interface NumberLiteral extends NumberClause {
    "@class": "apex.jorje.data.soql.NumberClause$NumberLiteral";
    number: number;
    "@id"?: string;
    "@reference"?: string;
}

export interface OffsetClause {
    "@class": "apex.jorje.data.soql.OffsetClause$OffsetExpr" | "apex.jorje.data.soql.OffsetClause$OffsetValue";
}

export interface OffsetExpr extends OffsetClause {
    "@class": "apex.jorje.data.soql.OffsetClause$OffsetExpr";
    expr: ColonExpr;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface OffsetValue extends OffsetClause {
    "@class": "apex.jorje.data.soql.OffsetClause$OffsetValue";
    i: number;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface Order {
    "@class": "apex.jorje.data.soql.Order$OrderAsc" | "apex.jorje.data.soql.Order$OrderDesc";
}

export interface OrderAsc extends Order {
    "@class": "apex.jorje.data.soql.Order$OrderAsc";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface OrderByClause {
    "@class": "apex.jorje.data.soql.OrderByClause";
    exprs: OrderByExpr[];
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface OrderByDistance extends OrderByExpr {
    "@class": "apex.jorje.data.soql.OrderByExpr$OrderByDistance";
    distance: DistanceFunctionExpr;
    nullOrder: OrderNull;
    order: Order;
    "@id"?: string;
    "@reference"?: string;
}

export interface OrderByExpr {
    "@class": "apex.jorje.data.soql.OrderByExpr$OrderByDistance" | "apex.jorje.data.soql.OrderByExpr$OrderByValue";
}

export interface OrderByValue extends OrderByExpr {
    "@class": "apex.jorje.data.soql.OrderByExpr$OrderByValue";
    field: Field;
    nullOrder: OrderNull;
    order: Order;
    "@id"?: string;
    "@reference"?: string;
}

export interface OrderDesc extends Order {
    "@class": "apex.jorje.data.soql.Order$OrderDesc";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface OrderNull {
    "@class": "apex.jorje.data.soql.OrderNull$OrderNullFirst" | "apex.jorje.data.soql.OrderNull$OrderNullLast";
}

export interface OrderNullFirst extends OrderNull {
    "@class": "apex.jorje.data.soql.OrderNull$OrderNullFirst";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface OrderNullLast extends OrderNull {
    "@class": "apex.jorje.data.soql.OrderNull$OrderNullLast";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface OverrideModifier extends Modifier {
    "@class": "apex.jorje.data.ast.Modifier$OverrideModifier";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface PackageVersionExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$PackageVersionExpr";
    loc: Location;
    version: VersionRef;
    "@id"?: string;
    "@reference"?: string;
}

export interface ParameterRef {
    "@class": "apex.jorje.data.ast.ParameterRefs$EmptyModifierParameterRef" | "apex.jorje.data.ast.ParameterRefs$ModifierParameterRef";
    modifiers: Modifier[];
    name: Identifier;
    type: TypeRef;
}

export interface ParameterRefs {
    "@class": "apex.jorje.data.ast.ParameterRefs";
    "@id"?: string;
    "@reference"?: string;
}

export interface ParseException extends CompilationException {
    "@class": "apex.jorje.services.exception.ParseException";
    userError: UserError;
    "@id"?: string;
    "@reference"?: string;
}

export interface ParserOutput {
    "@class": "apex.jorje.semantic.compiler.parser.ParserOutput";
    hiddenTokenMap: [{"@class": string}, HiddenToken][];
    internalErrors: InternalException[];
    parseErrors: ParseException[];
    unit: CompilationUnit;
    "@id"?: string;
    "@reference"?: string;
}

export interface PositionLocation extends Location {
    "@class": "apex.jorje.data.PositionLocation";
    "@id"?: string;
    "@reference"?: string;
}

export interface PostfixExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$PostfixExpr";
    expr: Expr;
    loc: Location;
    op: { $: PostfixOp; "@class": "apex.jorje.data.ast.PostfixOp"; };
    "@id"?: string;
    "@reference"?: string;
}

export interface PrefixExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$PrefixExpr";
    expr: Expr;
    loc: Location;
    op: { $: PrefixOp; "@class": "apex.jorje.data.ast.PrefixOp"; };
    "@id"?: string;
    "@reference"?: string;
}

export interface PrinterBlocks {
    "@class": "apex.jorje.data.ast.PrinterBlocks";
    "@id"?: string;
    "@reference"?: string;
}

export interface PrivateModifier extends Modifier {
    "@class": "apex.jorje.data.ast.Modifier$PrivateModifier";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface PropertyDecl {
    "@class": "apex.jorje.data.ast.PropertyDecl";
    getter?: PropertyGetter;
    modifiers: Modifier[];
    name: Identifier;
    setter?: PropertySetter;
    type: TypeRef;
    "@id"?: string;
    "@reference"?: string;
}

export interface PropertyGetter {
    "@class": "apex.jorje.data.ast.PropertyGetter";
    loc: Location;
    modifier?: Modifier;
    stmnt?: Stmnt;
    "@id"?: string;
    "@reference"?: string;
}

export interface PropertyMember extends BlockMember {
    "@class": "apex.jorje.data.ast.BlockMember$PropertyMember";
    propertyDecl: PropertyDecl;
    "@id"?: string;
    "@reference"?: string;
}

export interface PropertySetter {
    "@class": "apex.jorje.data.ast.PropertySetter";
    loc: Location;
    modifier?: Modifier;
    stmnt?: Stmnt;
    "@id"?: string;
    "@reference"?: string;
}

export interface ProtectedModifier extends Modifier {
    "@class": "apex.jorje.data.ast.Modifier$ProtectedModifier";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface PublicModifier extends Modifier {
    "@class": "apex.jorje.data.ast.Modifier$PublicModifier";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface Query {
    "@class": "apex.jorje.data.soql.Query";
    bind?: BindClause;
    from: FromClause;
    groupBy?: GroupByClause;
    limit?: LimitClause;
    offset?: OffsetClause;
    options?: QueryOption;
    orderBy?: OrderByClause;
    select: SelectClause;
    tracking?: TrackingType;
    updateStats?: UpdateStatsClause;
    where?: WhereClause;
    with?: WithClause;
    withIdentifiers: WithIdentifierClause[];
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryAnd extends WhereCompoundOp {
    "@class": "apex.jorje.data.soql.WhereCompoundOp$QueryAnd";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryDate extends QueryLiteral {
    "@class": "apex.jorje.data.soql.QueryLiteral$QueryDate";
    literal: Date;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryDateFormula extends QueryLiteral {
    "@class": "apex.jorje.data.soql.QueryLiteral$QueryDateFormula";
    dateFormula: string;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryDateTime extends QueryLiteral {
    "@class": "apex.jorje.data.soql.QueryLiteral$QueryDateTime";
    literal: Date;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryDoubleEqual extends QueryOp {
    "@class": "apex.jorje.data.soql.QueryOp$QueryDoubleEqual";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryEqual extends QueryOp {
    "@class": "apex.jorje.data.soql.QueryOp$QueryEqual";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryExcludes extends QueryOp {
    "@class": "apex.jorje.data.soql.QueryOp$QueryExcludes";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryExpr {
    "@class": "apex.jorje.data.soql.QueryExpr$ApexExpr" | "apex.jorje.data.soql.QueryExpr$LiteralExpr";
}

export interface QueryExprLiteralExpr extends QueryExpr {
    "@class": "apex.jorje.data.soql.QueryExpr$LiteralExpr";
    literal: QueryLiteral;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryFalse extends QueryLiteral {
    "@class": "apex.jorje.data.soql.QueryLiteral$QueryFalse";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryGreaterThan extends QueryOp {
    "@class": "apex.jorje.data.soql.QueryOp$QueryGreaterThan";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryGreaterThanEqual extends QueryOp {
    "@class": "apex.jorje.data.soql.QueryOp$QueryGreaterThanEqual";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryIn extends QueryOp {
    "@class": "apex.jorje.data.soql.QueryOp$QueryIn";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryIncludes extends QueryOp {
    "@class": "apex.jorje.data.soql.QueryOp$QueryIncludes";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryLessThan extends QueryOp {
    "@class": "apex.jorje.data.soql.QueryOp$QueryLessThan";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryLessThanEqual extends QueryOp {
    "@class": "apex.jorje.data.soql.QueryOp$QueryLessThanEqual";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryLike extends QueryOp {
    "@class": "apex.jorje.data.soql.QueryOp$QueryLike";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryLiteral {
    "@class": "apex.jorje.data.soql.QueryLiteral$QueryDate" | "apex.jorje.data.soql.QueryLiteral$QueryDateFormula" | "apex.jorje.data.soql.QueryLiteral$QueryDateTime" | "apex.jorje.data.soql.QueryLiteral$QueryFalse" | "apex.jorje.data.soql.QueryLiteral$QueryMultiCurrency" | "apex.jorje.data.soql.QueryLiteral$QueryNull" | "apex.jorje.data.soql.QueryLiteral$QueryNumber" | "apex.jorje.data.soql.QueryLiteral$QueryString" | "apex.jorje.data.soql.QueryLiteral$QueryTime" | "apex.jorje.data.soql.QueryLiteral$QueryTrue";
}

export interface QueryMultiCurrency extends QueryLiteral {
    "@class": "apex.jorje.data.soql.QueryLiteral$QueryMultiCurrency";
    literal: string;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryNotEqual extends QueryOp {
    "@class": "apex.jorje.data.soql.QueryOp$QueryNotEqual";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryNotIn extends QueryOp {
    "@class": "apex.jorje.data.soql.QueryOp$QueryNotIn";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryNotTripleEqual extends QueryOp {
    "@class": "apex.jorje.data.soql.QueryOp$QueryNotTripleEqual";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryNull extends QueryLiteral {
    "@class": "apex.jorje.data.soql.QueryLiteral$QueryNull";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryNumber extends QueryLiteral {
    "@class": "apex.jorje.data.soql.QueryLiteral$QueryNumber";
    literal: number;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryOp {
    "@class": "apex.jorje.data.soql.QueryOp$QueryDoubleEqual" | "apex.jorje.data.soql.QueryOp$QueryEqual" | "apex.jorje.data.soql.QueryOp$QueryExcludes" | "apex.jorje.data.soql.QueryOp$QueryGreaterThan" | "apex.jorje.data.soql.QueryOp$QueryGreaterThanEqual" | "apex.jorje.data.soql.QueryOp$QueryIn" | "apex.jorje.data.soql.QueryOp$QueryIncludes" | "apex.jorje.data.soql.QueryOp$QueryLessThan" | "apex.jorje.data.soql.QueryOp$QueryLessThanEqual" | "apex.jorje.data.soql.QueryOp$QueryLike" | "apex.jorje.data.soql.QueryOp$QueryNotEqual" | "apex.jorje.data.soql.QueryOp$QueryNotIn" | "apex.jorje.data.soql.QueryOp$QueryNotTripleEqual" | "apex.jorje.data.soql.QueryOp$QueryTripleEqual";
}

export interface QueryOption {
    "@class": "apex.jorje.data.soql.QueryOption$IncludeDeleted" | "apex.jorje.data.soql.QueryOption$LockRows";
}

export interface QueryOr extends WhereCompoundOp {
    "@class": "apex.jorje.data.soql.WhereCompoundOp$QueryOr";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryString extends QueryLiteral {
    "@class": "apex.jorje.data.soql.QueryLiteral$QueryString";
    literal: string;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryTime extends QueryLiteral {
    "@class": "apex.jorje.data.soql.QueryLiteral$QueryTime";
    literal: Date;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryTripleEqual extends QueryOp {
    "@class": "apex.jorje.data.soql.QueryOp$QueryTripleEqual";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryTrue extends QueryLiteral {
    "@class": "apex.jorje.data.soql.QueryLiteral$QueryTrue";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface QueryUsingClause {
    "@class": "apex.jorje.data.soql.QueryUsingClause";
    exprs: UsingExpr[];
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface RequestVersion extends VersionRef {
    "@class": "apex.jorje.data.ast.VersionRef$RequestVersion";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface ReturnStmnt extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$ReturnStmnt";
    expr?: Expr;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface ReturningClause {
    "@class": "apex.jorje.data.sosl.ReturningClause";
    exprs: ReturningExpr[];
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface ReturningExpr {
    "@class": "apex.jorje.data.sosl.ReturningExpr";
    name: Identifier;
    select?: ReturningSelectExpr;
    "@id"?: string;
    "@reference"?: string;
}

export interface ReturningSelectExpr {
    "@class": "apex.jorje.data.sosl.ReturningSelectExpr";
    bind?: BindClause;
    fields: Field[];
    limit?: LimitClause;
    loc: Location;
    offset?: OffsetClause;
    orderBy?: OrderByClause;
    using?: QueryUsingClause;
    where?: WhereClause;
    "@id"?: string;
    "@reference"?: string;
}

export interface RunAsBlock extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$RunAsBlock";
    inputParameters: Expr[];
    loc: Location;
    stmnt: Stmnt;
    "@id"?: string;
    "@reference"?: string;
}

export interface RuntimeException extends Exception {
    "@class": "java.lang.RuntimeException" | "apex.jorje.services.exception.InternalException" | "apex.jorje.services.exception.ParseException";
}

export interface Search {
    "@class": "apex.jorje.data.sosl.Search";
    dataCategory?: WithDataCategoryClause;
    division?: WithDivisionClause;
    find: FindClause;
    in?: InClause;
    limit?: LimitClause;
    returning?: ReturningClause;
    updateStats?: UpdateStatsClause;
    using?: SearchUsingClause;
    withs: SearchWithClause[];
    "@id"?: string;
    "@reference"?: string;
}

export interface SearchUsingClause {
    "@class": "apex.jorje.data.sosl.SearchUsingClause";
    loc: Location;
    type: UsingType;
    "@id"?: string;
    "@reference"?: string;
}

export interface SearchWithClause {
    "@class": "apex.jorje.data.sosl.SearchWithClause";
    name: Identifier;
    value?: SearchWithClauseValue;
    "@id"?: string;
    "@reference"?: string;
}

export interface SearchWithClauseValue {
    "@class": "apex.jorje.data.sosl.SearchWithClauseValue$SearchWithFalseValue" | "apex.jorje.data.sosl.SearchWithClauseValue$SearchWithStringValue" | "apex.jorje.data.sosl.SearchWithClauseValue$SearchWithTargetValue" | "apex.jorje.data.sosl.SearchWithClauseValue$SearchWithTrueValue";
}

export interface SearchWithFalseValue extends SearchWithClauseValue {
    "@class": "apex.jorje.data.sosl.SearchWithClauseValue$SearchWithFalseValue";
    "@id"?: string;
    "@reference"?: string;
}

export interface SearchWithStringValue extends SearchWithClauseValue {
    "@class": "apex.jorje.data.sosl.SearchWithClauseValue$SearchWithStringValue";
    values: string[];
    "@id"?: string;
    "@reference"?: string;
}

export interface SearchWithTargetValue extends SearchWithClauseValue {
    "@class": "apex.jorje.data.sosl.SearchWithClauseValue$SearchWithTargetValue";
    target: Identifier;
    value: number;
    "@id"?: string;
    "@reference"?: string;
}

export interface SearchWithTrueValue extends SearchWithClauseValue {
    "@class": "apex.jorje.data.sosl.SearchWithClauseValue$SearchWithTrueValue";
    "@id"?: string;
    "@reference"?: string;
}

export interface SelectCaseExpr extends SelectExpr {
    "@class": "apex.jorje.data.soql.SelectExpr$SelectCaseExpr";
    alias?: Identifier;
    expr: CaseExpr;
    "@id"?: string;
    "@reference"?: string;
}

export interface SelectClause {
    "@class": "apex.jorje.data.soql.SelectClause$SelectColumnClause" | "apex.jorje.data.soql.SelectClause$SelectCountClause";
}

export interface SelectColumnClause extends SelectClause {
    "@class": "apex.jorje.data.soql.SelectClause$SelectColumnClause";
    exprs: SelectExpr[];
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface SelectColumnExpr extends SelectExpr {
    "@class": "apex.jorje.data.soql.SelectExpr$SelectColumnExpr";
    alias?: Identifier;
    field: Field;
    "@id"?: string;
    "@reference"?: string;
}

export interface SelectCountClause extends SelectClause {
    "@class": "apex.jorje.data.soql.SelectClause$SelectCountClause";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface SelectDistanceExpr extends SelectExpr {
    "@class": "apex.jorje.data.soql.SelectExpr$SelectDistanceExpr";
    alias?: Identifier;
    expr: DistanceFunctionExpr;
    "@id"?: string;
    "@reference"?: string;
}

export interface SelectExpr {
    "@class": "apex.jorje.data.soql.SelectExpr$SelectCaseExpr" | "apex.jorje.data.soql.SelectExpr$SelectColumnExpr" | "apex.jorje.data.soql.SelectExpr$SelectDistanceExpr" | "apex.jorje.data.soql.SelectExpr$SelectInnerQuery";
}

export interface SelectInnerQuery extends SelectExpr {
    "@class": "apex.jorje.data.soql.SelectExpr$SelectInnerQuery";
    alias?: Identifier;
    query: Query;
    "@id"?: string;
    "@reference"?: string;
}

export interface Serializable {
    "@class": "java.lang.Throwable" | "java.lang.Exception" | "java.lang.RuntimeException" | "apex.jorje.services.exception.InternalException" | "apex.jorje.services.exception.ParseException" | "java.lang.StackTraceElement";
}

export interface SoqlExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$SoqlExpr";
    loc: Location;
    query: Query;
    rawQuery: string;
    "@id"?: string;
    "@reference"?: string;
}

export interface SoslExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$SoslExpr";
    loc: Location;
    rawQuery: string;
    search: Search;
    "@id"?: string;
    "@reference"?: string;
}

export interface SoslValues {
    "@class": "apex.jorje.data.sosl.SoslValues";
    "@id"?: string;
    "@reference"?: string;
}

export interface StackTraceElement extends Serializable {
    "@class": "java.lang.StackTraceElement";
    classLoaderName: string;
    className: string;
    fileName: string;
    lineNumber: number;
    methodName: string;
    moduleName: string;
    moduleVersion: string;
    nativeMethod: boolean;
}

export interface StaticModifier extends Modifier {
    "@class": "apex.jorje.data.ast.Modifier$StaticModifier";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface StaticStmntBlockMember extends BlockMember {
    "@class": "apex.jorje.data.ast.BlockMember$StaticStmntBlockMember";
    loc: Location;
    stmnt: Stmnt;
    "@id"?: string;
    "@reference"?: string;
}

export interface Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$BlockStmnt" | "apex.jorje.data.ast.Stmnt$BreakStmnt" | "apex.jorje.data.ast.Stmnt$ContinueStmnt" | "apex.jorje.data.ast.Stmnt$DmlDeleteStmnt" | "apex.jorje.data.ast.Stmnt$DmlInsertStmnt" | "apex.jorje.data.ast.Stmnt$DmlMergeStmnt" | "apex.jorje.data.ast.Stmnt$DmlUndeleteStmnt" | "apex.jorje.data.ast.Stmnt$DmlUpdateStmnt" | "apex.jorje.data.ast.Stmnt$DmlUpsertStmnt" | "apex.jorje.data.ast.Stmnt$DoLoop" | "apex.jorje.data.ast.Stmnt$ExpressionStmnt" | "apex.jorje.data.ast.Stmnt$ForLoop" | "apex.jorje.data.ast.Stmnt$IfElseBlock" | "apex.jorje.data.ast.Stmnt$ReturnStmnt" | "apex.jorje.data.ast.Stmnt$RunAsBlock" | "apex.jorje.data.ast.Stmnt$SwitchStmnt" | "apex.jorje.data.ast.Stmnt$ThrowStmnt" | "apex.jorje.data.ast.Stmnt$TryCatchFinallyBlock" | "apex.jorje.data.ast.Stmnt$VariableDeclStmnt" | "apex.jorje.data.ast.Stmnt$WhileLoop";
}

export interface StmntBlockMember extends BlockMember {
    "@class": "apex.jorje.data.ast.BlockMember$StmntBlockMember";
    stmnt: Stmnt;
    "@id"?: string;
    "@reference"?: string;
}

export interface StringAnnotationValue extends AnnotationValue {
    "@class": "apex.jorje.data.ast.AnnotationValue$StringAnnotationValue";
    loc: Location;
    value: string;
    "@id"?: string;
    "@reference"?: string;
}

export interface StringKeyValue extends WithKeyValue {
    "@class": "apex.jorje.data.soql.WithKeyValue$StringKeyValue";
    identifier: Identifier;
    value: string;
    "@id"?: string;
    "@reference"?: string;
}

export interface StructuredVersion extends VersionRef {
    "@class": "apex.jorje.data.ast.VersionRef$StructuredVersion";
    major: number;
    minor: number;
    "@id"?: string;
    "@reference"?: string;
}

export interface SuperMethodCallExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$SuperMethodCallExpr";
    inputParameters: Expr[];
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface SuperVariableExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$SuperVariableExpr";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface SwitchStmnt extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$SwitchStmnt";
    expr: Expr;
    loc: Location;
    whenBlocks: WhenBlock[];
    "@id"?: string;
    "@reference"?: string;
}

export interface SwitchTester {
    "@class": "apex.jorje.data.SwitchTester";
    "@id"?: string;
    "@reference"?: string;
}

export interface SymbolInUnexpectedSet extends LexicalError {
    "@class": "apex.jorje.data.errors.LexicalError$SymbolInUnexpectedSet";
    found: string;
    loc: Location;
    unexpected: string[];
    "@id"?: string;
    "@reference"?: string;
}

export interface SymbolNotInExpectedSet extends LexicalError {
    "@class": "apex.jorje.data.errors.LexicalError$SymbolNotInExpectedSet";
    expected: string[];
    found: string;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface SymbolNotInRange extends LexicalError {
    "@class": "apex.jorje.data.errors.LexicalError$SymbolNotInRange";
    begin: string;
    end: string;
    found: string;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface Syntax extends UserError {
    "@class": "apex.jorje.data.errors.UserError$Syntax";
    error: SyntaxError;
    "@id"?: string;
    "@reference"?: string;
}

export interface SyntaxError {
    "@class": "apex.jorje.data.errors.SyntaxError$IllegalDecimalLiteral" | "apex.jorje.data.errors.SyntaxError$IllegalDoubleLiteral" | "apex.jorje.data.errors.SyntaxError$IllegalIntegerLiteral" | "apex.jorje.data.errors.SyntaxError$IllegalLongLiteral" | "apex.jorje.data.errors.SyntaxError$IllegalStringLiteral" | "apex.jorje.data.errors.SyntaxError$MismatchedSyntax" | "apex.jorje.data.errors.SyntaxError$MissingSyntax" | "apex.jorje.data.errors.SyntaxError$UnexpectedEof" | "apex.jorje.data.errors.SyntaxError$UnexpectedSyntaxError" | "apex.jorje.data.errors.SyntaxError$UnexpectedToken" | "apex.jorje.data.errors.SyntaxError$UnmatchedSyntax";
}

export interface SyntheticIdentifier extends Identifier {
    "@class": "apex.jorje.data.Identifiers$SyntheticIdentifier";
    "@id"?: string;
    "@reference"?: string;
}

export interface TernaryExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$TernaryExpr";
    condition: Expr;
    falseExpr: Expr;
    trueExpr: Expr;
    "@id"?: string;
    "@reference"?: string;
}

export interface TestMethodModifier extends Modifier {
    "@class": "apex.jorje.data.ast.Modifier$TestMethodModifier";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface ThisMethodCallExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$ThisMethodCallExpr";
    inputParameters: Expr[];
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface ThisVariableExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$ThisVariableExpr";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface ThrowStmnt extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$ThrowStmnt";
    expr: Expr;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface Throwable extends Serializable {
    "@class": "java.lang.Throwable" | "java.lang.Exception" | "java.lang.RuntimeException" | "apex.jorje.services.exception.InternalException" | "apex.jorje.services.exception.ParseException";
    cause: Throwable;
    localizedMessage: string;
    message: string;
    stackTrace: StackTraceElement[];
    suppressed: Throwable[];
}

export interface TrackingType {
    "@class": "apex.jorje.data.soql.TrackingType$ForReference" | "apex.jorje.data.soql.TrackingType$ForView";
}

export interface TransientModifier extends Modifier {
    "@class": "apex.jorje.data.ast.Modifier$TransientModifier";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface TriggerDeclUnit extends CompilationUnit {
    "@class": "apex.jorje.data.ast.CompilationUnit$TriggerDeclUnit";
    isBulk: boolean;
    loc: Location;
    members: BlockMember[];
    name: Identifier;
    target: Identifier[];
    usages: { $: TriggerUsage; "@class": "apex.jorje.data.ast.TriggerUsage"; }[];
    "@id"?: string;
    "@reference"?: string;
}

export interface TriggerVariableExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$TriggerVariableExpr";
    loc: Location;
    variable: Identifier;
    "@id"?: string;
    "@reference"?: string;
}

export interface TrueAnnotationValue extends AnnotationValue {
    "@class": "apex.jorje.data.ast.AnnotationValue$TrueAnnotationValue";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface TryCatchFinallyBlock extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$TryCatchFinallyBlock";
    catchBlocks: CatchBlock[];
    finallyBlock?: FinallyBlock;
    loc: Location;
    tryBlock: Stmnt;
    "@id"?: string;
    "@reference"?: string;
}

export interface TypeRef {
    "@class": "apex.jorje.data.ast.TypeRefs$ArrayTypeRef" | "apex.jorje.data.ast.TypeRefs$ClassTypeRef" | "apex.jorje.data.ast.TypeRefs$JavaTypeRef";
    names: Identifier[];
    typeArguments: TypeRef[];
}

export interface TypeRefBuilder {
    "@class": "apex.jorje.data.TypeRefBuilder";
    "@id"?: string;
    "@reference"?: string;
}

export interface TypeRefs {
    "@class": "apex.jorje.data.ast.TypeRefs";
    "@id"?: string;
    "@reference"?: string;
}

export interface TypeWhen extends WhenBlock {
    "@class": "apex.jorje.data.ast.WhenBlock$TypeWhen";
    name: Identifier;
    stmnt: Stmnt;
    typeRef: TypeRef;
    "@id"?: string;
    "@reference"?: string;
}

export interface UnexpectedEof extends SyntaxError {
    "@class": "apex.jorje.data.errors.SyntaxError$UnexpectedEof";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface UnexpectedLexicalError extends LexicalError {
    "@class": "apex.jorje.data.errors.LexicalError$UnexpectedLexicalError";
    loc: Location;
    message: string;
    "@id"?: string;
    "@reference"?: string;
}

export interface UnexpectedSymbol extends LexicalError {
    "@class": "apex.jorje.data.errors.LexicalError$UnexpectedSymbol";
    expected: string;
    found: string;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface UnexpectedSyntaxError extends SyntaxError {
    "@class": "apex.jorje.data.errors.SyntaxError$UnexpectedSyntaxError";
    loc: Location;
    message: string;
    "@id"?: string;
    "@reference"?: string;
}

export interface UnexpectedToken extends SyntaxError {
    "@class": "apex.jorje.data.errors.SyntaxError$UnexpectedToken";
    loc: Location;
    token: string;
    "@id"?: string;
    "@reference"?: string;
}

export interface UnmatchedSyntax extends SyntaxError {
    "@class": "apex.jorje.data.errors.SyntaxError$UnmatchedSyntax";
    actual: string;
    expected: string;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface UnrecognizedSymbol extends LexicalError {
    "@class": "apex.jorje.data.errors.LexicalError$UnrecognizedSymbol";
    loc: Location;
    symbol: string;
    "@id"?: string;
    "@reference"?: string;
}

export interface UnterminatedComment extends LexicalError {
    "@class": "apex.jorje.data.errors.LexicalError$UnterminatedComment";
    closeComment: string;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface UnterminatedString extends LexicalError {
    "@class": "apex.jorje.data.errors.LexicalError$UnterminatedString";
    loc: Location;
    quote: string;
    "@id"?: string;
    "@reference"?: string;
}

export interface UpdateStatsClause {
    "@class": "apex.jorje.data.soql.UpdateStatsClause";
    loc: Location;
    options: UpdateStatsOption[];
    "@id"?: string;
    "@reference"?: string;
}

export interface UpdateStatsOption {
    "@class": "apex.jorje.data.soql.UpdateStatsOption$UpdateTracking" | "apex.jorje.data.soql.UpdateStatsOption$UpdateViewStat";
}

export interface UpdateTracking extends UpdateStatsOption {
    "@class": "apex.jorje.data.soql.UpdateStatsOption$UpdateTracking";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface UpdateViewStat extends UpdateStatsOption {
    "@class": "apex.jorje.data.soql.UpdateStatsOption$UpdateViewStat";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface UserError {
    "@class": "apex.jorje.data.errors.UserError$Lexical" | "apex.jorje.data.errors.UserError$Syntax";
}

export interface Using extends UsingExpr {
    "@class": "apex.jorje.data.soql.UsingExpr$Using";
    field: Identifier;
    name: Identifier;
    "@id"?: string;
    "@reference"?: string;
}

export interface UsingEquals extends UsingExpr {
    "@class": "apex.jorje.data.soql.UsingExpr$UsingEquals";
    field: Identifier;
    name: Identifier;
    "@id"?: string;
    "@reference"?: string;
}

export interface UsingExpr {
    "@class": "apex.jorje.data.soql.UsingExpr$Using" | "apex.jorje.data.soql.UsingExpr$UsingEquals" | "apex.jorje.data.soql.UsingExpr$UsingId";
}

export interface UsingId extends UsingExpr {
    "@class": "apex.jorje.data.soql.UsingExpr$UsingId";
    field: Identifier;
    id: Identifier;
    name: Identifier;
    "@id"?: string;
    "@reference"?: string;
}

export interface UsingType {
    "@class": "apex.jorje.data.sosl.UsingType";
    filter: Identifier;
    value: Identifier;
    "@id"?: string;
    "@reference"?: string;
}

export interface ValueWhen extends WhenBlock {
    "@class": "apex.jorje.data.ast.WhenBlock$ValueWhen";
    stmnt: Stmnt;
    whenCases: WhenCase[];
    "@id"?: string;
    "@reference"?: string;
}

export interface VariableDecl {
    "@class": "apex.jorje.data.ast.VariableDecl";
    assignment?: Expr;
    name: Identifier;
    "@id"?: string;
    "@reference"?: string;
}

export interface VariableDeclStmnt extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$VariableDeclStmnt";
    variableDecls: VariableDecls;
    "@id"?: string;
    "@reference"?: string;
}

export interface VariableDecls {
    "@class": "apex.jorje.data.ast.VariableDecls";
    decls: VariableDecl[];
    modifiers: Modifier[];
    type: TypeRef;
    "@id"?: string;
    "@reference"?: string;
}

export interface VariableExpr extends Expr {
    "@class": "apex.jorje.data.ast.Expr$VariableExpr";
    dottedExpr?: Expr;
    isSafeNav: boolean;
    names: Identifier[];
    "@id"?: string;
    "@reference"?: string;
}

export interface VersionRef {
    "@class": "apex.jorje.data.ast.VersionRef$RequestVersion" | "apex.jorje.data.ast.VersionRef$StructuredVersion";
}

export interface VirtualModifier extends Modifier {
    "@class": "apex.jorje.data.ast.Modifier$VirtualModifier";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface WebServiceModifier extends Modifier {
    "@class": "apex.jorje.data.ast.Modifier$WebServiceModifier";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface WhenBlock {
    "@class": "apex.jorje.data.ast.WhenBlock$ElseWhen" | "apex.jorje.data.ast.WhenBlock$TypeWhen" | "apex.jorje.data.ast.WhenBlock$ValueWhen";
}

export interface WhenCase {
    "@class": "apex.jorje.data.ast.WhenCase$EnumCase" | "apex.jorje.data.ast.WhenCase$LiteralCase";
}

export interface WhenExpr {
    "@class": "apex.jorje.data.soql.WhenExpr";
    identifiers: FieldIdentifier[];
    loc: Location;
    op: WhenOp;
    "@id"?: string;
    "@reference"?: string;
}

export interface WhenOp {
    "@class": "apex.jorje.data.soql.WhenOp";
    identifier: Identifier;
    "@id"?: string;
    "@reference"?: string;
}

export interface WhereCalcExpr extends WhereExpr {
    "@class": "apex.jorje.data.soql.WhereExpr$WhereCalcExpr";
    calc: WhereCalcOp;
    expr: QueryExpr;
    field1: FieldIdentifier;
    field2: FieldIdentifier;
    op: QueryOp;
    "@id"?: string;
    "@reference"?: string;
}

export interface WhereCalcMinus extends WhereCalcOp {
    "@class": "apex.jorje.data.soql.WhereCalcOp$WhereCalcMinus";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface WhereCalcOp {
    "@class": "apex.jorje.data.soql.WhereCalcOp$WhereCalcMinus" | "apex.jorje.data.soql.WhereCalcOp$WhereCalcPlus";
}

export interface WhereCalcPlus extends WhereCalcOp {
    "@class": "apex.jorje.data.soql.WhereCalcOp$WhereCalcPlus";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface WhereClause {
    "@class": "apex.jorje.data.soql.WhereClause";
    expr: WhereExpr;
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface WhereCompoundExpr extends WhereExpr {
    "@class": "apex.jorje.data.soql.WhereExpr$WhereCompoundExpr";
    expr: WhereExpr[];
    op: WhereCompoundOp;
    "@id"?: string;
    "@reference"?: string;
}

export interface WhereCompoundOp {
    "@class": "apex.jorje.data.soql.WhereCompoundOp$QueryAnd" | "apex.jorje.data.soql.WhereCompoundOp$QueryOr";
}

export interface WhereDistanceExpr extends WhereExpr {
    "@class": "apex.jorje.data.soql.WhereExpr$WhereDistanceExpr";
    distance: DistanceFunctionExpr;
    expr: QueryExpr;
    op: QueryOp;
    "@id"?: string;
    "@reference"?: string;
}

export interface WhereExpr {
    "@class": "apex.jorje.data.soql.WhereExpr$WhereCalcExpr" | "apex.jorje.data.soql.WhereExpr$WhereCompoundExpr" | "apex.jorje.data.soql.WhereExpr$WhereDistanceExpr" | "apex.jorje.data.soql.WhereExpr$WhereInnerExpr" | "apex.jorje.data.soql.WhereExpr$WhereOpExpr" | "apex.jorje.data.soql.WhereExpr$WhereOpExprs" | "apex.jorje.data.soql.WhereExpr$WhereUnaryExpr";
}

export interface WhereInnerExpr extends WhereExpr {
    "@class": "apex.jorje.data.soql.WhereExpr$WhereInnerExpr";
    field: Field;
    inner: Query;
    op: QueryOp;
    "@id"?: string;
    "@reference"?: string;
}

export interface WhereOpExpr extends WhereExpr {
    "@class": "apex.jorje.data.soql.WhereExpr$WhereOpExpr";
    expr: QueryExpr;
    field: Field;
    op: QueryOp;
    "@id"?: string;
    "@reference"?: string;
}

export interface WhereOpExprs extends WhereExpr {
    "@class": "apex.jorje.data.soql.WhereExpr$WhereOpExprs";
    expr: QueryExpr[];
    field: Field;
    op: QueryOp;
    "@id"?: string;
    "@reference"?: string;
}

export interface WhereUnaryExpr extends WhereExpr {
    "@class": "apex.jorje.data.soql.WhereExpr$WhereUnaryExpr";
    expr: WhereExpr;
    op: WhereUnaryOp;
    "@id"?: string;
    "@reference"?: string;
}

export interface WhereUnaryOp {
    "@class": "apex.jorje.data.soql.WhereUnaryOp";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface WhileLoop extends Stmnt {
    "@class": "apex.jorje.data.ast.Stmnt$WhileLoop";
    condition: Expr;
    loc: Location;
    stmnt?: Stmnt;
    "@id"?: string;
    "@reference"?: string;
}

export interface WithClause {
    "@class": "apex.jorje.data.soql.WithClause$WithDataCategories" | "apex.jorje.data.soql.WithClause$WithValue";
}

export interface WithDataCategories extends WithClause {
    "@class": "apex.jorje.data.soql.WithClause$WithDataCategories";
    categories: DataCategory[];
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface WithDataCategoryClause {
    "@class": "apex.jorje.data.sosl.WithDataCategoryClause";
    categories: DataCategory[];
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface WithDivisionClause {
    "@class": "apex.jorje.data.sosl.WithDivisionClause";
    loc: Location;
    value: DivisionValue;
    "@id"?: string;
    "@reference"?: string;
}

export interface WithIdentifier extends WithIdentifierClause {
    "@class": "apex.jorje.data.soql.WithIdentifierClause$WithIdentifier";
    identifier: Identifier;
    "@id"?: string;
    "@reference"?: string;
}

export interface WithIdentifierClause {
    "@class": "apex.jorje.data.soql.WithIdentifierClause$WithIdentifier" | "apex.jorje.data.soql.WithIdentifierClause$WithIdentifierTuple";
}

export interface WithIdentifierTuple extends WithIdentifierClause {
    "@class": "apex.jorje.data.soql.WithIdentifierClause$WithIdentifierTuple";
    identifier: Identifier;
    keyValues: WithKeyValue[];
    "@id"?: string;
    "@reference"?: string;
}

export interface WithKeyValue {
    "@class": "apex.jorje.data.soql.WithKeyValue$BooleanKeyValue" | "apex.jorje.data.soql.WithKeyValue$NumberKeyValue" | "apex.jorje.data.soql.WithKeyValue$StringKeyValue";
}

export interface WithSharingModifier extends Modifier {
    "@class": "apex.jorje.data.ast.Modifier$WithSharingModifier";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export interface WithValue extends WithClause {
    "@class": "apex.jorje.data.soql.WithClause$WithValue";
    expr: QueryExpr;
    loc: Location;
    name: FieldIdentifier;
    "@id"?: string;
    "@reference"?: string;
}

export interface WithoutSharingModifier extends Modifier {
    "@class": "apex.jorje.data.ast.Modifier$WithoutSharingModifier";
    loc: Location;
    "@id"?: string;
    "@reference"?: string;
}

export type AssignmentOp = "EQUALS" | "AND_EQUALS" | "OR_EQUALS" | "XOR_EQUALS" | "ADDITION_EQUALS" | "SUBTRACTION_EQUALS" | "MULTIPLICATION_EQUALS" | "DIVISION_EQUALS" | "LEFT_SHIFT_EQUALS" | "RIGHT_SHIFT_EQUALS" | "UNSIGNED_RIGHT_SHIFT_EQUALS";

export type BinaryOp = "ADDITION" | "SUBTRACTION" | "MULTIPLICATION" | "DIVISION" | "LEFT_SHIFT" | "RIGHT_SHIFT" | "UNSIGNED_RIGHT_SHIFT" | "XOR" | "AND" | "OR";

export type BooleanOp = "DOUBLE_EQUAL" | "TRIPLE_EQUAL" | "NOT_TRIPLE_EQUAL" | "NOT_EQUAL" | "ALT_NOT_EQUAL" | "LESS_THAN" | "GREATER_THAN" | "LESS_THAN_EQUAL" | "GREATER_THAN_EQUAL" | "AND" | "OR";

export type LiteralType = "STRING" | "INTEGER" | "LONG" | "DOUBLE" | "DECIMAL" | "TRUE" | "FALSE" | "NULL";

export type PostfixOp = "INC" | "DEC";

export type PrefixOp = "POSITIVE" | "NEGATIVE" | "NOT" | "BITWISE_COMPLEMENT" | "INC" | "DEC";

export type TriggerUsage = "AFTER_DELETE" | "AFTER_INSERT" | "AFTER_UNDELETE" | "AFTER_UPDATE" | "BEFORE_DELETE" | "BEFORE_INSERT" | "BEFORE_UNDELETE" | "BEFORE_UPDATE";
