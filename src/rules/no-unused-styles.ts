/**
 * @fileoverview ESLint plugin - Detects unused styles in React Native (supports function calls)
 */
import { Rule } from "eslint";

// no-unused-styles rule definition
export const noUnusedStylesRule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Detects styles defined in StyleSheet.create in React Native that are not used",
      recommended: true,
    },
    fixable: undefined,
    schema: [], // No options
  },
  create: function (context) {
    // Map of defined style names to their AST nodes
    const definedStyles = new Map<string, Rule.Node>(); // styleName -> node
    // Set of used style names
    const usedStyles = new Set<string>();
    // Mapping from StyleSheet variables to their defined style names
    const styleSheetMap = new Map<string, Set<string>>(); // stylesheetVarName -> Set of styleNames

    // Helper function to extract style names from nodes
    function extractStyleNames(node: Rule.Node): string[] {
      if (!node) return [];

      const styleNames: string[] = [];

      // Case like styles.container
      if (
        node.type === "MemberExpression" &&
        node.object &&
        (node.object as any).name &&
        node.property &&
        node.property.type === "Identifier"
      ) {
        styleNames.push((node.property as any).name);
      }
      // Case like [styles.container, styles.text]
      else if (node.type === "ArrayExpression") {
        (node as any).elements.forEach((elem: any) => {
          if (elem) {
            const names = extractStyleNames(elem);
            styleNames.push(...names);
          }
        });
      }
      // Spread syntax
      else if (node.type === "SpreadElement" && (node as any).argument) {
        const names = extractStyleNames((node as any).argument);
        styleNames.push(...names);
      }
      // Conditional expression
      else if (node.type === "ConditionalExpression") {
        const consequentNames = extractStyleNames((node as any).consequent);
        const alternateNames = extractStyleNames((node as any).alternate);
        const testNames = (node as any).test
          ? extractStyleNames((node as any).test)
          : [];

        styleNames.push(...consequentNames, ...alternateNames, ...testNames);
      }
      // When the entire object is passed — treat as all styles being used
      else if (
        node.type === "Identifier" &&
        styleSheetMap.has((node as any).name)
      ) {
        const names = Array.from(styleSheetMap.get((node as any).name) || []);
        styleNames.push(...names);
      }
      // Handle ObjectExpression (e.g., inline styles, spread)
      else if (node.type === "ObjectExpression") {
        (node as any).properties.forEach((prop: any) => {
          if (prop.type === "SpreadElement") {
            const names = extractStyleNames(prop.argument);
            styleNames.push(...names);
          } else if (prop.type === "Property" && prop.value) {
            const names = extractStyleNames(prop.value);
            styleNames.push(...names);
          }
        });
      }
      // Handle Property nodes directly
      else if (node.type === "Property" && (node as any).value) {
        const names = extractStyleNames((node as any).value);
        styleNames.push(...names);
      }
      // Handle LogicalExpression (e.g., &&, ||)
      else if (node.type === "LogicalExpression") {
        const leftNames = extractStyleNames((node as any).left);
        const rightNames = extractStyleNames((node as any).right);

        styleNames.push(...leftNames, ...rightNames);
      }
      // Handle other expressions
      else if (
        node.type === "BinaryExpression" ||
        node.type === "UnaryExpression" ||
        node.type === "UpdateExpression"
      ) {
        if ((node as any).left) {
          const names = extractStyleNames((node as any).left);
          styleNames.push(...names);
        }
        if ((node as any).right) {
          const names = extractStyleNames((node as any).right);
          styleNames.push(...names);
        }
        if ((node as any).argument) {
          const names = extractStyleNames((node as any).argument);
          styleNames.push(...names);
        }
      }

      return styleNames;
    }

    return {
      // Detect calls to StyleSheet.create
      "VariableDeclarator[init.callee.object.name='StyleSheet'][init.callee.property.name='create']":
        function (node: Rule.Node) {
          // Collect style definitions
          if (
            (node as any).init &&
            (node as any).init.arguments &&
            (node as any).init.arguments.length > 0 &&
            (node as any).init.arguments[0] &&
            (node as any).id &&
            (node as any).id.name
          ) {
            const styleSheetVarName = (node as any).id.name;
            const styleNamesInThisSheet = new Set<string>();

            const stylesObj = (node as any).init.arguments[0];
            if (stylesObj.type === "ObjectExpression") {
              stylesObj.properties.forEach((prop: any) => {
                if (
                  prop.key &&
                  (prop.key.name ||
                    (prop.key.value && typeof prop.key.value === "string"))
                ) {
                  const styleName = prop.key.name || prop.key.value;
                  definedStyles.set(styleName, prop);
                  styleNamesInThisSheet.add(styleName);
                }
              });
            }

            styleSheetMap.set(styleSheetVarName, styleNamesInThisSheet);
          }
        },

      // Detect style usage in JSX
      JSXAttribute: function (node: Rule.Node) {
        if (
          (node as any).name &&
          (node as any).name.name &&
          /[sS]tyle$/.test((node as any).name.name)
        ) {
          if ((node as any).value && (node as any).value.expression) {
            const names = extractStyleNames((node as any).value.expression);
            names.forEach((name) => {
              usedStyles.add(name);
            });
          }
        }
      },

      // Detect destructuring assignments from StyleSheet
      "VariableDeclarator[init.type='Identifier']": function (node: Rule.Node) {
        const initName = (node as any).init.name;
        if (styleSheetMap.has(initName)) {
          if ((node as any).id.type === "ObjectPattern") {
            (node as any).id.properties.forEach((prop: any) => {
              if (prop.key && prop.key.name) {
                usedStyles.add(prop.key.name);
              }
            });
          }
        }
      },

      // Detect style references from return statements
      ReturnStatement: function (node: Rule.Node) {
        if ((node as any).argument) {
          const names = extractStyleNames((node as any).argument);
          names.forEach((name) => usedStyles.add(name));
        }
      },

      // Detect style references from assignment expressions
      AssignmentExpression: function (node: Rule.Node) {
        if ((node as any).right) {
          const names = extractStyleNames((node as any).right);
          names.forEach((name) => usedStyles.add(name));
        }
      },

      // Report unused styles at the end of the program
      "Program:exit": function () {
        definedStyles.forEach((node, styleName) => {
          if (!usedStyles.has(styleName)) {
            context.report({
              node: node,
              message: `Style '${styleName}' is defined but never used.`,
            });
          }
        });
      },
    };
  },
};

export default {
  rules: {
    "no-unused-styles": noUnusedStylesRule,
  },
};
