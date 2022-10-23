export const APEX_TYPES = {
  TRIGGER_USAGE: "apex.jorje.data.ast.TriggerUsage" as const,
  LOCATION_IDENTIFIER:
    "apex.jorje.data.Identifiers$LocationIdentifier" as const,
  PARSER_OUTPUT: "apex.jorje.semantic.compiler.parser.ParserOutput" as const,
  CLASS_TYPE_REF: "apex.jorje.data.ast.TypeRefs$ClassTypeRef" as const,
  ARRAY_TYPE_REF: "apex.jorje.data.ast.TypeRefs$ArrayTypeRef" as const,
  JAVA_TYPE_REF: "apex.jorje.data.ast.TypeRefs$JavaTypeRef" as const,
  MODIFIER: "apex.jorje.data.ast.Modifier" as const,
  ANNOTATION: "apex.jorje.data.ast.Modifier$Annotation" as const,
  ANNOTATION_KEY_VALUE:
    "apex.jorje.data.ast.AnnotationParameter$AnnotationKeyValue" as const,
  ANNOTATION_VALUE: "apex.jorje.data.ast.AnnotationValue" as const,
  ANNOTATION_STRING:
    "apex.jorje.data.ast.AnnotationParameter$AnnotationString" as const,
  MODIFIER_PARAMETER_REF:
    "apex.jorje.data.ast.ParameterRefs$ModifierParameterRef" as const,
  EMPTY_MODIFIER_PARAMETER_REF:
    "apex.jorje.data.ast.ParameterRefs$EmptyModifierParameterRef" as const,
  BLOCK_STATEMENT: "apex.jorje.data.ast.Stmnt$BlockStmnt" as const,
  RETURN_STATEMENT: "apex.jorje.data.ast.Stmnt$ReturnStmnt" as const,
  VARIABLE_DECLARATION_STATEMENT:
    "apex.jorje.data.ast.Stmnt$VariableDeclStmnt" as const,
  VARIABLE_DECLARATIONS: "apex.jorje.data.ast.VariableDecls" as const,
  NAME_VALUE_PARAMETER: "apex.jorje.data.ast.NameValueParameter" as const,
  IF_ELSE_BLOCK: "apex.jorje.data.ast.Stmnt$IfElseBlock" as const,
  IF_BLOCK: "apex.jorje.data.ast.IfBlock" as const,
  ELSE_BLOCK: "apex.jorje.data.ast.ElseBlock" as const,
  EXPRESSION_STATEMENT: "apex.jorje.data.ast.Stmnt$ExpressionStmnt" as const,
  RUN_AS_BLOCK: "apex.jorje.data.ast.Stmnt$RunAsBlock" as const,
  WHILE_LOOP: "apex.jorje.data.ast.Stmnt$WhileLoop" as const,
  DO_LOOP: "apex.jorje.data.ast.Stmnt$DoLoop" as const,
  FOR_LOOP: "apex.jorje.data.ast.Stmnt$ForLoop" as const,
  FOR_C_STYLE_CONTROL:
    "apex.jorje.data.ast.ForControl$CStyleForControl" as const,
  FOR_ENHANCED_CONTROL:
    "apex.jorje.data.ast.ForControl$EnhancedForControl" as const,
  FOR_INITS: "apex.jorje.data.ast.ForInits" as const,
  FOR_INIT: "apex.jorje.data.ast.ForInit" as const,
  BREAK_STATEMENT: "apex.jorje.data.ast.Stmnt$BreakStmnt" as const,
  CONTINUE_STATEMENT: "apex.jorje.data.ast.Stmnt$ContinueStmnt" as const,
  THROW_STATEMENT: "apex.jorje.data.ast.Stmnt$ThrowStmnt" as const,
  TRY_CATCH_FINALLY_BLOCK:
    "apex.jorje.data.ast.Stmnt$TryCatchFinallyBlock" as const,
  CATCH_BLOCK: "apex.jorje.data.ast.CatchBlock" as const,
  FINALLY_BLOCK: "apex.jorje.data.ast.FinallyBlock" as const,
  STATEMENT: "apex.jorje.data.ast.Stmnt" as const,
  DML_INSERT_STATEMENT: "apex.jorje.data.ast.Stmnt$DmlInsertStmnt" as const,
  DML_UPDATE_STATEMENT: "apex.jorje.data.ast.Stmnt$DmlUpdateStmnt" as const,
  DML_UPSERT_STATEMENT: "apex.jorje.data.ast.Stmnt$DmlUpsertStmnt" as const,
  DML_DELETE_STATEMENT: "apex.jorje.data.ast.Stmnt$DmlDeleteStmnt" as const,
  DML_UNDELETE_STATEMENT: "apex.jorje.data.ast.Stmnt$DmlUndeleteStmnt" as const,
  DML_MERGE_STATEMENT: "apex.jorje.data.ast.Stmnt$DmlMergeStmnt" as const,
  SWITCH_STATEMENT: "apex.jorje.data.ast.Stmnt$SwitchStmnt" as const,
  VALUE_WHEN: "apex.jorje.data.ast.WhenBlock$ValueWhen" as const,
  ELSE_WHEN: "apex.jorje.data.ast.WhenBlock$ElseWhen" as const,
  TYPE_WHEN: "apex.jorje.data.ast.WhenBlock$TypeWhen" as const,
  ENUM_CASE: "apex.jorje.data.ast.WhenCase$EnumCase" as const,
  LITERAL_CASE: "apex.jorje.data.ast.WhenCase$LiteralCase" as const,
  PROPERTY_DECLATION: "apex.jorje.data.ast.PropertyDecl" as const,
  PROPERTY_GETTER: "apex.jorje.data.ast.PropertyGetter" as const,
  PROPERTY_SETTER: "apex.jorje.data.ast.PropertySetter" as const,
  BLOCK_COMMENT: "apex.jorje.parser.impl.HiddenTokens$BlockComment" as const,
  INLINE_COMMENT: "apex.jorje.parser.impl.HiddenTokens$InlineComment" as const,
  REQUEST_VERSION: "apex.jorje.data.ast.VersionRef$RequestVersion" as const,
  STRUCTURED_VERSION:
    "apex.jorje.data.ast.VersionRef$StructuredVersion" as const,

  // Operators
  BINARY_OPERATOR: "apex.jorje.data.ast.BinaryOp" as const,
  ASSIGNMENT_OPERATOR: "apex.jorje.data.ast.AssignmentOp" as const,
  BOOLEAN_OPERATOR: "apex.jorje.data.ast.BooleanOp" as const,
  POSTFIX_OPERATOR: "apex.jorje.data.ast.PostfixOp" as const,
  PREFIX_OPERATOR: "apex.jorje.data.ast.PrefixOp" as const,

  // Declaration
  CLASS_DECLARATION: "apex.jorje.data.ast.ClassDecl" as const,
  INTERFACE_DECLARATION: "apex.jorje.data.ast.InterfaceDecl" as const,
  METHOD_DECLARATION: "apex.jorje.data.ast.MethodDecl" as const,
  VARIABLE_DECLARATION: "apex.jorje.data.ast.VariableDecl" as const,
  ENUM_DECLARATION: "apex.jorje.data.ast.EnumDecl" as const,

  // Compilation Unit
  CLASS_DECLARATION_UNIT:
    "apex.jorje.data.ast.CompilationUnit$ClassDeclUnit" as const,
  ENUM_DECLARATION_UNIT:
    "apex.jorje.data.ast.CompilationUnit$EnumDeclUnit" as const,
  TRIGGER_DECLARATION_UNIT:
    "apex.jorje.data.ast.CompilationUnit$TriggerDeclUnit" as const,
  INTERFACE_DECLARATION_UNIT:
    "apex.jorje.data.ast.CompilationUnit$InterfaceDeclUnit" as const,
  ANONYMOUS_BLOCK_UNIT:
    "apex.jorje.data.ast.CompilationUnit$AnonymousBlockUnit" as const,

  // Block Member
  PROPERTY_MEMBER: "apex.jorje.data.ast.BlockMember$PropertyMember" as const,
  FIELD_MEMBER: "apex.jorje.data.ast.BlockMember$FieldMember" as const,
  STATEMENT_BLOCK_MEMBER:
    "apex.jorje.data.ast.BlockMember$StmntBlockMember" as const,
  STATIC_STATEMENT_BLOCK_MEMBER:
    "apex.jorje.data.ast.BlockMember$StaticStmntBlockMember" as const,
  METHOD_MEMBER: "apex.jorje.data.ast.BlockMember$MethodMember" as const,
  INNER_ENUM_MEMBER: "apex.jorje.data.ast.BlockMember$InnerEnumMember" as const,
  INNER_CLASS_MEMBER:
    "apex.jorje.data.ast.BlockMember$InnerClassMember" as const,
  INNER_INTERFACE_MEMBER:
    "apex.jorje.data.ast.BlockMember$InnerInterfaceMember" as const,

  // Expression
  METHOD_CALL_EXPRESSION: "apex.jorje.data.ast.Expr$MethodCallExpr" as const,
  BINARY_EXPRESSION: "apex.jorje.data.ast.Expr$BinaryExpr" as const,
  LITERAL_EXPRESSION: "apex.jorje.data.ast.Expr$LiteralExpr" as const,
  VARIABLE_EXPRESSION: "apex.jorje.data.ast.Expr$VariableExpr" as const,
  THIS_VARIABLE_EXPRESSION:
    "apex.jorje.data.ast.Expr$ThisVariableExpr" as const,
  BOOLEAN_EXPRESSION: "apex.jorje.data.ast.Expr$BooleanExpr" as const,
  NESTED_EXPRESSION: "apex.jorje.data.ast.Expr$NestedExpr" as const,
  TERNARY_EXPRESSION: "apex.jorje.data.ast.Expr$TernaryExpr" as const,
  ASSIGNMENT_EXPRESSION: "apex.jorje.data.ast.Expr$AssignmentExpr" as const,
  TRIGGER_VARIABLE_EXPRESSION:
    "apex.jorje.data.ast.Expr$TriggerVariableExpr" as const,
  PREFIX_EXPRESSION: "apex.jorje.data.ast.Expr$PrefixExpr" as const,
  POSTFIX_EXPRESSION: "apex.jorje.data.ast.Expr$PostfixExpr" as const,
  NEW_EXPRESSION: "apex.jorje.data.ast.Expr$NewExpr" as const,
  CAST_EXPRESSION: "apex.jorje.data.ast.Expr$CastExpr" as const,
  INSTANCE_OF_EXPRESSION: "apex.jorje.data.ast.Expr$InstanceOf" as const,
  PACKAGE_VERSION_EXPRESSION:
    "apex.jorje.data.ast.Expr$PackageVersionExpr" as const,
  ARRAY_EXPRESSION: "apex.jorje.data.ast.Expr$ArrayExpr" as const,
  SUPER_VARIABLE_EXPRESSION:
    "apex.jorje.data.ast.Expr$SuperVariableExpr" as const,
  CLASS_REF_EXPRESSION: "apex.jorje.data.ast.Expr$ClassRefExpr" as const,
  THIS_METHOD_CALL_EXPRESSION:
    "apex.jorje.data.ast.Expr$ThisMethodCallExpr" as const,
  SUPER_METHOD_CALL_EXPRESSION:
    "apex.jorje.data.ast.Expr$SuperMethodCallExpr" as const,
  SOQL_EXPRESSION: "apex.jorje.data.ast.Expr$SoqlExpr" as const,
  SOSL_EXPRESSION: "apex.jorje.data.ast.Expr$SoslExpr" as const,
  JAVA_VARIABLE_EXPRESSION:
    "apex.jorje.data.ast.Expr$JavaVariableExpr" as const,
  JAVA_METHOD_CALL_EXPRESSION:
    "apex.jorje.data.ast.Expr$JavaMethodCallExpr" as const,

  // New Object Init
  NEW_SET_INIT: "apex.jorje.data.ast.NewObject$NewSetInit" as const,
  NEW_SET_LITERAL: "apex.jorje.data.ast.NewObject$NewSetLiteral" as const,
  NEW_LIST_INIT: "apex.jorje.data.ast.NewObject$NewListInit" as const,
  NEW_LIST_LITERAL: "apex.jorje.data.ast.NewObject$NewListLiteral" as const,
  NEW_MAP_INIT: "apex.jorje.data.ast.NewObject$NewMapInit" as const,
  NEW_MAP_LITERAL: "apex.jorje.data.ast.NewObject$NewMapLiteral" as const,
  NEW_STANDARD: "apex.jorje.data.ast.NewObject$NewStandard" as const,
  NEW_KEY_VALUE: "apex.jorje.data.ast.NewObject$NewKeyValue" as const,
  MAP_LITERAL_KEY_VALUE: "apex.jorje.data.ast.MapLiteralKeyValue" as const,

  // SOSL
  SEARCH: "apex.jorje.data.sosl.Search" as const,
  FIND_CLAUSE: "apex.jorje.data.sosl.FindClause" as const,
  FIND_VALUE: "apex.jorje.data.sosl.FindValue" as const,
  IN_CLAUSE: "apex.jorje.data.sosl.InClause" as const,
  WITH_DIVISION_CLAUSE: "apex.jorje.data.sosl.WithDivisionClause" as const,
  DIVISION_VALUE: "apex.jorje.data.sosl.DivisionValue" as const,
  WITH_DATA_CATEGORY_CLAUSE:
    "apex.jorje.data.sosl.WithDataCategoryClause" as const,
  SEARCH_WITH_CLAUSE: "apex.jorje.data.sosl.SearchWithClause" as const,
  SEARCH_WITH_CLAUSE_VALUE:
    "apex.jorje.data.sosl.SearchWithClauseValue" as const,
  RETURNING_CLAUSE: "apex.jorje.data.sosl.ReturningClause" as const,
  RETURNING_EXPRESSION: "apex.jorje.data.sosl.ReturningExpr" as const,
  RETURNING_SELECT_EXPRESSION:
    "apex.jorje.data.sosl.ReturningSelectExpr" as const,
  SEARCH_USING_CLAUSE: "apex.jorje.data.sosl.SearchUsingClause" as const,
  USING_TYPE: "apex.jorje.data.sosl.UsingType" as const,

  // SOQL
  QUERY: "apex.jorje.data.soql.Query" as const,
  BIND_CLAUSE: "apex.jorje.data.soql.BindClause" as const,
  BIND_EXPRESSION: "apex.jorje.data.soql.BindExpr" as const,
  SELECT_INNER_QUERY:
    "apex.jorje.data.soql.SelectExpr$SelectInnerQuery" as const,
  SELECT_COLUMN_CLAUSE:
    "apex.jorje.data.soql.SelectClause$SelectColumnClause" as const,
  SELECT_COUNT_CLAUSE:
    "apex.jorje.data.soql.SelectClause$SelectCountClause" as const,
  SELECT_COLUMN_EXPRESSION:
    "apex.jorje.data.soql.SelectExpr$SelectColumnExpr" as const,
  SELECT_CASE_EXPRESSION:
    "apex.jorje.data.soql.SelectExpr$SelectCaseExpr" as const,
  CASE_EXPRESSION: "apex.jorje.data.soql.CaseExpr" as const,
  CASE_OPERATOR: "apex.jorje.data.soql.CaseOp" as const,
  WHEN_EXPRESSION: "apex.jorje.data.soql.WhenExpr" as const,
  WHEN_OPERATOR: "apex.jorje.data.soql.WhenOp" as const,
  ELSE_EXPRESSION: "apex.jorje.data.soql.ElseExpr" as const,
  FIELD: "apex.jorje.data.soql.Field" as const,
  FIELD_IDENTIFIER: "apex.jorje.data.soql.FieldIdentifier" as const,
  FROM_CLAUSE: "apex.jorje.data.soql.FromClause" as const,
  FROM_EXPRESSION: "apex.jorje.data.soql.FromExpr" as const,
  WHERE_CLAUSE: "apex.jorje.data.soql.WhereClause" as const,
  WHERE_INNER_EXPRESSION:
    "apex.jorje.data.soql.WhereExpr$WhereInnerExpr" as const,
  WHERE_OPERATION_EXPRESSION:
    "apex.jorje.data.soql.WhereExpr$WhereOpExpr" as const,
  WHERE_OPERATION_EXPRESSIONS:
    "apex.jorje.data.soql.WhereExpr$WhereOpExprs" as const,
  APEX_EXPRESSION: "apex.jorje.data.soql.QueryExpr$ApexExpr" as const,
  COLON_EXPRESSION: "apex.jorje.data.soql.ColonExpr" as const,
  ORDER_BY_CLAUSE: "apex.jorje.data.soql.OrderByClause" as const,
  ORDER_BY_EXPRESSION: "apex.jorje.data.soql.OrderByExpr" as const,
  GROUP_BY_CLAUSE: "apex.jorje.data.soql.GroupByClause" as const,
  GROUP_BY_EXPRESSION: "apex.jorje.data.soql.GroupByExpr" as const,
  GROUP_BY_TYPE: "apex.jorje.data.soql.GroupByType" as const,
  HAVING_CLAUSE: "apex.jorje.data.soql.HavingClause" as const,
  LIMIT_VALUE: "apex.jorje.data.soql.LimitClause$LimitValue" as const,
  LIMIT_EXPRESSION: "apex.jorje.data.soql.LimitClause$LimitExpr" as const,
  OFFSET_VALUE: "apex.jorje.data.soql.OffsetClause$OffsetValue" as const,
  OFFSET_EXPRESSION: "apex.jorje.data.soql.OffsetClause$OffsetExpr" as const,
  WHERE_CALC_EXPRESSION:
    "apex.jorje.data.soql.WhereExpr$WhereCalcExpr" as const,
  WHERE_CALC_OPERATOR_PLUS:
    "apex.jorje.data.soql.WhereCalcOp$WhereCalcPlus" as const,
  WHERE_CALC_OPERATOR_MINUS:
    "apex.jorje.data.soql.WhereCalcOp$WhereCalcMinus" as const,
  WHERE_COMPOUND_EXPRESSION:
    "apex.jorje.data.soql.WhereExpr$WhereCompoundExpr" as const,
  WHERE_COMPOUND_OPERATOR: "apex.jorje.data.soql.WhereCompoundOp" as const,
  WHERE_UNARY_EXPRESSION:
    "apex.jorje.data.soql.WhereExpr$WhereUnaryExpr" as const,
  WHERE_UNARY_OPERATOR: "apex.jorje.data.soql.WhereUnaryOp" as const,
  SELECT_DISTANCE_EXPRESSION:
    "apex.jorje.data.soql.SelectExpr$SelectDistanceExpr" as const,
  WHERE_DISTANCE_EXPRESSION:
    "apex.jorje.data.soql.WhereExpr$WhereDistanceExpr" as const,
  DISTANCE_FUNCTION_EXPRESSION:
    "apex.jorje.data.soql.DistanceFunctionExpr" as const,
  GEOLOCATION_LITERAL:
    "apex.jorje.data.soql.Geolocation$GeolocationLiteral" as const,
  GEOLOCATION_EXPRESSION:
    "apex.jorje.data.soql.Geolocation$GeolocationExpr" as const,
  NUMBER_LITERAL: "apex.jorje.data.soql.NumberClause$NumberLiteral" as const,
  NUMBER_EXPRESSION: "apex.jorje.data.soql.NumberClause$NumberExpr" as const,
  QUERY_LITERAL_EXPRESSION:
    "apex.jorje.data.soql.QueryExpr$LiteralExpr" as const,
  QUERY_LITERAL: "apex.jorje.data.soql.QueryLiteral" as const,
  QUERY_LITERAL_STRING:
    "apex.jorje.data.soql.QueryLiteral$QueryString" as const,
  QUERY_LITERAL_NULL: "apex.jorje.data.soql.QueryLiteral$QueryNull" as const,
  QUERY_LITERAL_TRUE: "apex.jorje.data.soql.QueryLiteral$QueryTrue" as const,
  QUERY_LITERAL_FALSE: "apex.jorje.data.soql.QueryLiteral$QueryFalse" as const,
  QUERY_LITERAL_NUMBER:
    "apex.jorje.data.soql.QueryLiteral$QueryNumber" as const,
  QUERY_LITERAL_DATE_FORMULA:
    "apex.jorje.data.soql.QueryLiteral$QueryDateFormula" as const,
  QUERY_OPERATOR: "apex.jorje.data.soql.QueryOp" as const,
  QUERY_OPERATOR_LIKE: "apex.jorje.data.soql.QueryOp$QueryLike" as const,
  SOQL_ORDER: "apex.jorje.data.soql.Order" as const,
  SOQL_ORDER_NULL: "apex.jorje.data.soql.OrderNull" as const,
  TRACKING_TYPE: "apex.jorje.data.soql.TrackingType" as const,
  QUERY_OPTION: "apex.jorje.data.soql.QueryOption" as const,
  QUERY_USING_CLAUSE: "apex.jorje.data.soql.QueryUsingClause" as const,
  USING_EXPRESSION: "apex.jorje.data.soql.UsingExpr" as const,
  UPDATE_STATS_CLAUSE: "apex.jorje.data.soql.UpdateStatsClause" as const,
  UPDATE_STATS_OPTION: "apex.jorje.data.soql.UpdateStatsOption" as const,
  WITH_VALUE: "apex.jorje.data.soql.WithClause$WithValue" as const,
  WITH_DATA_CATEGORIES:
    "apex.jorje.data.soql.WithClause$WithDataCategories" as const,
  DATA_CATEGORY: "apex.jorje.data.soql.DataCategory" as const,
  DATA_CATEGORY_OPERATOR: "apex.jorje.data.soql.DataCategoryOperator" as const,
  WITH_IDENTIFIER:
    "apex.jorje.data.soql.WithIdentifierClause$WithIdentifier" as const,
};
export const BINARY = {
  ADDITION: "+" as const,
  SUBTRACTION: "-" as const,
  MULTIPLICATION: "*" as const,
  DIVISION: "/" as const,
  LEFT_SHIFT: "<<" as const,
  RIGHT_SHIFT: ">>" as const,
  UNSIGNED_RIGHT_SHIFT: ">>>" as const,
  XOR: "^" as const,
  AND: "&" as const,
  OR: "|" as const,
};
export const BOOLEAN = {
  DOUBLE_EQUAL: "==" as const,
  TRIPLE_EQUAL: "===" as const,
  NOT_TRIPLE_EQUAL: "!==" as const,
  NOT_EQUAL: "!=" as const,
  ALT_NOT_EQUAL: "<>" as const,
  LESS_THAN: "<" as const,
  GREATER_THAN: ">" as const,
  LESS_THAN_EQUAL: "<=" as const,
  GREATER_THAN_EQUAL: ">=" as const,
  AND: "&&" as const,
  OR: "||" as const,
};
export const ASSIGNMENT = {
  EQUALS: "=" as const,
  AND_EQUALS: "&=" as const,
  OR_EQUALS: "|=" as const,
  XOR_EQUALS: "^=" as const,
  ADDITION_EQUALS: "+=" as const,
  SUBTRACTION_EQUALS: "-=" as const,
  MULTIPLICATION_EQUALS: "*=" as const,
  DIVISION_EQUALS: "/=" as const,
  LEFT_SHIFT_EQUALS: "<<=" as const,
  RIGHT_SHIFT_EQUALS: ">>=" as const,
  UNSIGNED_RIGHT_SHIFT_EQUALS: ">>>=" as const,
};
export const POSTFIX = {
  INC: "++" as const,
  DEC: "--" as const,
};
export const PREFIX = {
  POSITIVE: "+" as const,
  NEGATIVE: "-" as const,
  NOT: "!" as const,
  BITWISE_COMPLEMENT: "~" as const,
  INC: "++" as const,
  DEC: "--" as const,
};
export const QUERY = {
  "apex.jorje.data.soql.QueryOp$QueryIncludes": "INCLUDES" as const,
  "apex.jorje.data.soql.QueryOp$QueryExcludes": "EXCLUDES" as const,
  "apex.jorje.data.soql.QueryOp$QueryEqual": "=" as const,
  "apex.jorje.data.soql.QueryOp$QueryDoubleEqual": "==" as const,
  "apex.jorje.data.soql.QueryOp$QueryTripleEqual": "===" as const,
  "apex.jorje.data.soql.QueryOp$QueryNotEqual": "!=" as const,
  "apex.jorje.data.soql.QueryOp$QueryNotTripleEqual": "!==" as const,
  "apex.jorje.data.soql.QueryOp$QueryLike": "LIKE" as const,
  "apex.jorje.data.soql.QueryOp$QueryLessThanEqual": "<=" as const,
  "apex.jorje.data.soql.QueryOp$QueryGreaterThanEqual": ">=" as const,
  "apex.jorje.data.soql.QueryOp$QueryLessThan": "<" as const,
  "apex.jorje.data.soql.QueryOp$QueryGreaterThan": ">" as const,
  "apex.jorje.data.soql.QueryOp$QueryIn": "IN" as const,
  "apex.jorje.data.soql.QueryOp$QueryNotIn": "NOT IN" as const,
};
export const ORDER = {
  "apex.jorje.data.soql.Order$OrderDesc": "DESC" as const,
  "apex.jorje.data.soql.Order$OrderAsc": "ASC" as const,
};
export const ORDER_NULL = {
  "apex.jorje.data.soql.OrderNull$OrderNullFirst": "NULLS FIRST" as const,
  "apex.jorje.data.soql.OrderNull$OrderNullLast": "NULLS LAST" as const,
};
export const QUERY_WHERE = {
  "apex.jorje.data.soql.WhereCompoundOp$QueryAnd": "AND" as const,
  "apex.jorje.data.soql.WhereCompoundOp$QueryOr": "OR" as const,
};
export const MODIFIER = {
  "apex.jorje.data.ast.Modifier$PublicModifier": "public" as const,
  "apex.jorje.data.ast.Modifier$PrivateModifier": "private" as const,
  "apex.jorje.data.ast.Modifier$VirtualModifier": "virtual" as const,
  "apex.jorje.data.ast.Modifier$HiddenModifier": "hidden" as const,
  "apex.jorje.data.ast.Modifier$ProtectedModifier": "protected" as const,
  "apex.jorje.data.ast.Modifier$AbstractModifier": "abstract" as const,
  "apex.jorje.data.ast.Modifier$StaticModifier": "static" as const,
  "apex.jorje.data.ast.Modifier$TestMethodModifier": "testMethod" as const,
  "apex.jorje.data.ast.Modifier$WebServiceModifier": "webService" as const,
  "apex.jorje.data.ast.Modifier$FinalModifier": "final" as const,
  "apex.jorje.data.ast.Modifier$TransientModifier": "transient" as const,
  "apex.jorje.data.ast.Modifier$GlobalModifier": "global" as const,
  "apex.jorje.data.ast.Modifier$WithoutSharingModifier":
    "without sharing" as const,
  "apex.jorje.data.ast.Modifier$WithSharingModifier": "with sharing" as const,
  "apex.jorje.data.ast.Modifier$InheritedSharingModifier":
    "inherited sharing" as const,
  "apex.jorje.data.ast.Modifier$OverrideModifier": "override" as const,
  // This is a special case, it is actually handled in a separate method, but
  // we still need to specify it here to satisfy Typescript exhaustive check.
  "apex.jorje.data.ast.Modifier$Annotation": "" as const,
};
export const DATA_CATEGORY = {
  "apex.jorje.data.soql.DataCategoryOperator$DataCategoryAt": "AT" as const,
  "apex.jorje.data.soql.DataCategoryOperator$DataCategoryAbove":
    "ABOVE" as const,
  "apex.jorje.data.soql.DataCategoryOperator$DataCategoryBelow":
    "BELOW" as const,
  "apex.jorje.data.soql.DataCategoryOperator$DataCategoryAboveOrBelow":
    "ABOVE_OR_BELOW" as const,
};
export const TRIGGER_USAGE = {
  BEFORE_DELETE: "before delete" as const,
  BEFORE_INSERT: "before insert" as const,
  BEFORE_UPDATE: "before update" as const,
  BEFORE_UNDELETE: "before undelete" as const,
  AFTER_DELETE: "after delete" as const,
  AFTER_INSERT: "after insert" as const,
  AFTER_UPDATE: "after update" as const,
  AFTER_UNDELETE: "after undelete" as const,
};

export const ALLOW_TRAILING_EMPTY_LINE = [
  APEX_TYPES.BLOCK_STATEMENT,
  APEX_TYPES.EXPRESSION_STATEMENT,
  APEX_TYPES.DML_INSERT_STATEMENT,
  APEX_TYPES.DML_UPDATE_STATEMENT,
  APEX_TYPES.DML_UPSERT_STATEMENT,
  APEX_TYPES.DML_DELETE_STATEMENT,
  APEX_TYPES.DML_UNDELETE_STATEMENT,
  APEX_TYPES.DML_MERGE_STATEMENT,
  APEX_TYPES.VARIABLE_DECLARATION_STATEMENT,
  APEX_TYPES.IF_ELSE_BLOCK,
  APEX_TYPES.TRY_CATCH_FINALLY_BLOCK,
  APEX_TYPES.DO_LOOP,
  APEX_TYPES.FOR_LOOP,
  APEX_TYPES.WHILE_LOOP,
  APEX_TYPES.RETURN_STATEMENT,
  APEX_TYPES.THROW_STATEMENT,
  APEX_TYPES.BREAK_STATEMENT,
  APEX_TYPES.CONTINUE_STATEMENT,
  APEX_TYPES.SWITCH_STATEMENT,
  APEX_TYPES.ENUM_DECLARATION,
  APEX_TYPES.CLASS_DECLARATION,
  APEX_TYPES.INTERFACE_DECLARATION,
  APEX_TYPES.FIELD_MEMBER,
  APEX_TYPES.PROPERTY_MEMBER,
  APEX_TYPES.METHOD_MEMBER,
  APEX_TYPES.INNER_CLASS_MEMBER,
  APEX_TYPES.INNER_INTERFACE_MEMBER,
  APEX_TYPES.INNER_ENUM_MEMBER,
];

export const TRAILING_EMPTY_LINE_AFTER_LAST_NODE = [
  APEX_TYPES.VARIABLE_DECLARATION_STATEMENT,
  APEX_TYPES.IF_ELSE_BLOCK,
  APEX_TYPES.TRY_CATCH_FINALLY_BLOCK,
  APEX_TYPES.DO_LOOP,
  APEX_TYPES.FOR_LOOP,
  APEX_TYPES.WHILE_LOOP,
  APEX_TYPES.SWITCH_STATEMENT,
  APEX_TYPES.FIELD_MEMBER,
  APEX_TYPES.PROPERTY_MEMBER,
  APEX_TYPES.METHOD_MEMBER,
  APEX_TYPES.INNER_CLASS_MEMBER,
  APEX_TYPES.INNER_INTERFACE_MEMBER,
  APEX_TYPES.INNER_ENUM_MEMBER,
];

export const ALLOW_DANGLING_COMMENTS = [
  APEX_TYPES.TRIGGER_DECLARATION_UNIT,
  APEX_TYPES.CLASS_DECLARATION,
  APEX_TYPES.ENUM_DECLARATION,
  APEX_TYPES.INTERFACE_DECLARATION,
  APEX_TYPES.BLOCK_STATEMENT,
];
