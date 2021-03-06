"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const experimental_utils_1 = require("@typescript-eslint/experimental-utils");
const scope_manager_1 = require("@typescript-eslint/scope-manager");
const no_unused_vars_1 = __importDefault(require("eslint/lib/rules/no-unused-vars"));
const util = __importStar(require("../util"));
exports.default = util.createRule({
    name: 'no-unused-vars',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow unused variables',
            category: 'Variables',
            recommended: 'warn',
            extendsBaseRule: true,
        },
        schema: no_unused_vars_1.default.meta.schema,
        messages: (_a = no_unused_vars_1.default.meta.messages) !== null && _a !== void 0 ? _a : {
            unusedVar: "'{{varName}}' is {{action}} but never used{{additional}}.",
        },
    },
    defaultOptions: [{}],
    create(context) {
        const rules = no_unused_vars_1.default.create(context);
        const filename = context.getFilename();
        const MODULE_DECL_CACHE = new Map();
        /**
         * Gets a list of TS module definitions for a specified variable.
         * @param variable eslint-scope variable object.
         */
        function getModuleNameDeclarations(variable) {
            const moduleDeclarations = [];
            variable.defs.forEach(def => {
                if (def.type === 'TSModuleName') {
                    moduleDeclarations.push(def.node);
                }
            });
            return moduleDeclarations;
        }
        /**
         * Determine if an identifier is referencing an enclosing name.
         * This only applies to declarations that create their own scope (modules, functions, classes)
         * @param ref The reference to check.
         * @param nodes The candidate function nodes.
         * @returns True if it's a self-reference, false if not.
         */
        function isBlockSelfReference(ref, nodes) {
            let scope = ref.from;
            while (scope) {
                if (nodes.indexOf(scope.block) >= 0) {
                    return true;
                }
                scope = scope.upper;
            }
            return false;
        }
        function isExported(variable, target) {
            // TS will require that all merged namespaces/interfaces are exported, so we only need to find one
            return variable.defs.some(def => {
                var _a, _b;
                return def.node.type === target &&
                    (((_a = def.node.parent) === null || _a === void 0 ? void 0 : _a.type) === experimental_utils_1.AST_NODE_TYPES.ExportNamedDeclaration ||
                        ((_b = def.node.parent) === null || _b === void 0 ? void 0 : _b.type) === experimental_utils_1.AST_NODE_TYPES.ExportDefaultDeclaration);
            });
        }
        return Object.assign(Object.assign({}, rules), { 'TSCallSignatureDeclaration, TSConstructorType, TSConstructSignatureDeclaration, TSDeclareFunction, TSEmptyBodyFunctionExpression, TSFunctionType, TSMethodSignature'(node) {
                // function type signature params create variables because they can be referenced within the signature,
                // but they obviously aren't unused variables for the purposes of this rule.
                for (const param of node.params) {
                    visitPattern(param, name => {
                        context.markVariableAsUsed(name.name);
                    });
                }
            },
            TSEnumDeclaration() {
                // enum members create variables because they can be referenced within the enum,
                // but they obviously aren't unused variables for the purposes of this rule.
                const scope = context.getScope();
                for (const variable of scope.variables) {
                    context.markVariableAsUsed(variable.name);
                }
            },
            TSMappedType(node) {
                // mapped types create a variable for their type name, but it's not necessary to reference it,
                // so we shouldn't consider it as unused for the purpose of this rule.
                context.markVariableAsUsed(node.typeParameter.name.name);
            },
            TSModuleDeclaration() {
                const childScope = context.getScope();
                const scope = util.nullThrows(context.getScope().upper, util.NullThrowsReasons.MissingToken(childScope.type, 'upper scope'));
                for (const variable of scope.variables) {
                    const moduleNodes = getModuleNameDeclarations(variable);
                    if (moduleNodes.length === 0 ||
                        // ignore unreferenced module definitions, as the base rule will report on them
                        variable.references.length === 0 ||
                        // ignore exported nodes
                        isExported(variable, experimental_utils_1.AST_NODE_TYPES.TSModuleDeclaration)) {
                        continue;
                    }
                    // check if the only reference to a module's name is a self-reference in its body
                    // this won't be caught by the base rule because it doesn't understand TS modules
                    const isOnlySelfReferenced = variable.references.every(ref => {
                        return isBlockSelfReference(ref, moduleNodes);
                    });
                    if (isOnlySelfReferenced) {
                        context.report({
                            node: variable.identifiers[0],
                            messageId: 'unusedVar',
                            data: {
                                varName: variable.name,
                                action: 'defined',
                                additional: '',
                            },
                        });
                    }
                }
            },
            [[
                'TSParameterProperty > AssignmentPattern > Identifier.left',
                'TSParameterProperty > Identifier.parameter',
            ].join(', ')](node) {
                // just assume parameter properties are used as property usage tracking is beyond the scope of this rule
                context.markVariableAsUsed(node.name);
            },
            ':matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression) > Identifier[name="this"].params'(node) {
                // this parameters should always be considered used as they're pseudo-parameters
                context.markVariableAsUsed(node.name);
            },
            'TSInterfaceDeclaration, TSTypeAliasDeclaration'(node) {
                const variable = context.getScope().set.get(node.id.name);
                if (!variable) {
                    return;
                }
                if (variable.references.length === 0 ||
                    // ignore exported nodes
                    isExported(variable, node.type)) {
                    return;
                }
                // check if the type is only self-referenced
                // this won't be caught by the base rule because it doesn't understand self-referencing types
                const isOnlySelfReferenced = variable.references.every(ref => {
                    if (ref.identifier.range[0] >= node.range[0] &&
                        ref.identifier.range[1] <= node.range[1]) {
                        return true;
                    }
                    return false;
                });
                if (isOnlySelfReferenced) {
                    context.report({
                        node: variable.identifiers[0],
                        messageId: 'unusedVar',
                        data: {
                            varName: variable.name,
                            action: 'defined',
                            additional: '',
                        },
                    });
                }
            },
            // declaration file handling
            [ambientDeclarationSelector(experimental_utils_1.AST_NODE_TYPES.Program, true)](node) {
                if (!util.isDefinitionFile(filename)) {
                    return;
                }
                markDeclarationChildAsUsed(node);
            },
            // global augmentation can be in any file, and they do not need exports
            'TSModuleDeclaration[declare = true][global = true]'() {
                context.markVariableAsUsed('global');
            },
            // children of a namespace that is a child of a declared namespace are auto-exported
            [ambientDeclarationSelector('TSModuleDeclaration[declare = true] > TSModuleBlock TSModuleDeclaration > TSModuleBlock', false)](node) {
                markDeclarationChildAsUsed(node);
            },
            // declared namespace handling
            [ambientDeclarationSelector('TSModuleDeclaration[declare = true] > TSModuleBlock', false)](node) {
                var _a;
                const moduleDecl = util.nullThrows((_a = node.parent) === null || _a === void 0 ? void 0 : _a.parent, util.NullThrowsReasons.MissingParent);
                // declared ambient modules with an `export =` statement will only export that one thing
                // all other statements are not automatically exported in this case
                if (moduleDecl.id.type === experimental_utils_1.AST_NODE_TYPES.Literal &&
                    checkModuleDeclForExportEquals(moduleDecl)) {
                    return;
                }
                markDeclarationChildAsUsed(node);
            } });
        function checkModuleDeclForExportEquals(node) {
            var _a, _b;
            const cached = MODULE_DECL_CACHE.get(node);
            if (cached != null) {
                return cached;
            }
            for (const statement of (_b = (_a = node.body) === null || _a === void 0 ? void 0 : _a.body) !== null && _b !== void 0 ? _b : []) {
                if (statement.type === experimental_utils_1.AST_NODE_TYPES.TSExportAssignment) {
                    MODULE_DECL_CACHE.set(node, true);
                    return true;
                }
            }
            MODULE_DECL_CACHE.set(node, false);
            return false;
        }
        function ambientDeclarationSelector(parent, childDeclare) {
            return [
                // Types are ambiently exported
                `${parent} > :matches(${[
                    experimental_utils_1.AST_NODE_TYPES.TSInterfaceDeclaration,
                    experimental_utils_1.AST_NODE_TYPES.TSTypeAliasDeclaration,
                ].join(', ')})`,
                // Value things are ambiently exported if they are "declare"d
                `${parent} > :matches(${[
                    experimental_utils_1.AST_NODE_TYPES.ClassDeclaration,
                    experimental_utils_1.AST_NODE_TYPES.TSDeclareFunction,
                    experimental_utils_1.AST_NODE_TYPES.TSEnumDeclaration,
                    experimental_utils_1.AST_NODE_TYPES.TSModuleDeclaration,
                    experimental_utils_1.AST_NODE_TYPES.VariableDeclaration,
                ].join(', ')})${childDeclare ? '[declare = true]' : ''}`,
            ].join(', ');
        }
        function markDeclarationChildAsUsed(node) {
            var _a;
            const identifiers = [];
            switch (node.type) {
                case experimental_utils_1.AST_NODE_TYPES.TSInterfaceDeclaration:
                case experimental_utils_1.AST_NODE_TYPES.TSTypeAliasDeclaration:
                case experimental_utils_1.AST_NODE_TYPES.ClassDeclaration:
                case experimental_utils_1.AST_NODE_TYPES.FunctionDeclaration:
                case experimental_utils_1.AST_NODE_TYPES.TSDeclareFunction:
                case experimental_utils_1.AST_NODE_TYPES.TSEnumDeclaration:
                case experimental_utils_1.AST_NODE_TYPES.TSModuleDeclaration:
                    if (((_a = node.id) === null || _a === void 0 ? void 0 : _a.type) === experimental_utils_1.AST_NODE_TYPES.Identifier) {
                        identifiers.push(node.id);
                    }
                    break;
                case experimental_utils_1.AST_NODE_TYPES.VariableDeclaration:
                    for (const declaration of node.declarations) {
                        visitPattern(declaration, pattern => {
                            identifiers.push(pattern);
                        });
                    }
                    break;
            }
            let scope = context.getScope();
            const shouldUseUpperScope = [
                experimental_utils_1.AST_NODE_TYPES.TSModuleDeclaration,
                experimental_utils_1.AST_NODE_TYPES.TSDeclareFunction,
            ].includes(node.type);
            if (scope.variableScope !== scope) {
                scope = scope.variableScope;
            }
            else if (shouldUseUpperScope && scope.upper) {
                scope = scope.upper;
            }
            for (const id of identifiers) {
                const superVar = scope.set.get(id.name);
                if (superVar) {
                    superVar.eslintUsed = true;
                }
            }
        }
        function visitPattern(node, cb) {
            const visitor = new scope_manager_1.PatternVisitor({}, node, cb);
            visitor.visit(node);
        }
    },
});
/*

###### TODO ######

Edge cases that aren't currently handled due to laziness and them being super edgy edge cases


--- function params referenced in typeof type refs in the function declaration ---
--- NOTE - TS gets these cases wrong

function _foo(
  arg: number // arg should be unused
): typeof arg {
  return 1 as any;
}

function _bar(
  arg: number, // arg should be unused
  _arg2: typeof arg,
) {}


--- function names referenced in typeof type refs in the function declaration ---
--- NOTE - TS gets these cases right

function foo( // foo should be unused
): typeof foo {
    return 1 as any;
}

function bar( // bar should be unused
  _arg: typeof bar
) {}

*/
/*

###### TODO ######

We currently extend base `no-unused-vars` implementation because it's easier and lighter-weight.

Because of this, there are a few false-negatives which won't get caught.
We could fix these if we fork the base rule; but that's a lot of code (~650 lines) to add in.
I didn't want to do that just yet without some real-world issues, considering these are pretty rare edge-cases.

These cases are mishandled because the base rule assumes that each variable has one def, but type-value shadowing
creates a variable with two defs

--- type-only or value-only references to type/value shadowed variables ---
--- NOTE - TS gets these cases wrong

type T = 1;
const T = 2; // this T should be unused

type U = T; // this U should be unused
const U = 3;

const _V = U;


--- partially exported type/value shadowed variables ---
--- NOTE - TS gets these cases wrong

export interface Foo {}
const Foo = 1; // this Foo should be unused

interface Bar {} // this Bar should be unused
export const Bar = 1;

*/
//# sourceMappingURL=no-unused-vars.js.map