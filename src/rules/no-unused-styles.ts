/**
 * @fileoverview ESLintプラグイン - React Native の未使用スタイルを検出
 */
import { Rule } from "eslint";

// no-unused-styles ルール定義
export const noUnusedStylesRule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "React NativeのStyleSheet.createで定義されたが使用されていないスタイルを検出します",
      recommended: true,
    },
    fixable: undefined,
    schema: [], // オプションなし
  },
  create: function (context) {
    // 定義されたスタイル名とノードのマップ
    const definedStyles = new Map<string, Rule.Node>(); // styleName -> node
    // 使用されたスタイル名のセット
    const usedStyles = new Set<string>();
    // StyleSheet変数から定義されたスタイルへのマッピング
    const styleSheetMap = new Map<string, Set<string>>(); // stylesheetVarName -> Set of styleNames

    // スタイル使用のチェックヘルパー関数
    function extractStyleNames(node: Rule.Node): string[] {
      if (!node) return [];

      const styleNames: string[] = [];

      // styles.container のようなケース
      if (
        node.type === "MemberExpression" &&
        node.object &&
        (node.object as any).name &&
        node.property &&
        node.property.type === "Identifier"
      ) {
        styleNames.push((node.property as any).name);
      }
      // [styles.container, styles.text] のようなケース
      else if (node.type === "ArrayExpression") {
        (node as any).elements.forEach((elem: any) => {
          if (elem) {
            const names = extractStyleNames(elem);
            styleNames.push(...names);
          }
        });
      }
      // スプレッド構文のケース
      else if (node.type === "SpreadElement" && (node as any).argument) {
        const names = extractStyleNames((node as any).argument);
        styleNames.push(...names);
      }
      // 条件演算子のケース
      else if (node.type === "ConditionalExpression") {
        const consequentNames = extractStyleNames((node as any).consequent);
        const alternateNames = extractStyleNames((node as any).alternate);
        const testNames = (node as any).test
          ? extractStyleNames((node as any).test)
          : [];

        styleNames.push(...consequentNames, ...alternateNames, ...testNames);
      }
      // オブジェクト全体が渡される場合 - すべてのスタイルが使用されたとみなす
      else if (
        node.type === "Identifier" &&
        styleSheetMap.has((node as any).name)
      ) {
        // styleSheet変数に含まれるすべてのスタイル名を追加
        const names = Array.from(styleSheetMap.get((node as any).name) || []);
        styleNames.push(...names);
      }
      // オブジェクト式での処理（インラインスタイルやスプレッド構文）
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
      // Propertyノードを直接処理
      else if (node.type === "Property" && (node as any).value) {
        const names = extractStyleNames((node as any).value);
        styleNames.push(...names);
      }
      // LogicalExpressionの処理（&& や || 演算子）
      else if (node.type === "LogicalExpression") {
        const leftNames = extractStyleNames((node as any).left);
        const rightNames = extractStyleNames((node as any).right);

        styleNames.push(...leftNames, ...rightNames);
      }
      // その他の式の処理
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
      // StyleSheet.createの呼び出しを検出
      "VariableDeclarator[init.callee.object.name='StyleSheet'][init.callee.property.name='create']":
        function (node: Rule.Node) {
          // スタイル定義を収集
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
                  // キーが識別子かリテラルかで処理を分ける
                  const styleName = prop.key.name || prop.key.value;
                  // スタイル名とノードを保存
                  definedStyles.set(styleName, prop);
                  // このStyleSheet変数に関連付けられたスタイル名を記録
                  styleNamesInThisSheet.add(styleName);
                }
              });
            }

            // StyleSheet変数名からスタイル名のセットへのマッピングを保存
            styleSheetMap.set(styleSheetVarName, styleNamesInThisSheet);
          }
        },

      // スタイルの使用を検出 - より包括的なセレクタを使用
      JSXAttribute: function (node: Rule.Node) {
        // style属性またはその派生形（contentContainerStyleなど）をチェック
        if (
          (node as any).name &&
          (node as any).name.name &&
          /[sS]tyle$/.test((node as any).name.name)
        ) {
          if ((node as any).value && (node as any).value.expression) {
            // JSX式の中のスタイル参照を分析
            const names = extractStyleNames((node as any).value.expression);

            // 使用されたスタイル名をセットに追加
            names.forEach((name) => {
              usedStyles.add(name);
            });
          }
        }
      },

      // スタイルシートの分割代入を検出
      "VariableDeclarator[init.type='Identifier']": function (node: Rule.Node) {
        const initName = (node as any).init.name;
        if (styleSheetMap.has(initName)) {
          // 分割代入の場合
          if ((node as any).id.type === "ObjectPattern") {
            (node as any).id.properties.forEach((prop: any) => {
              // 各プロパティを使用済みとしてマーク
              if (prop.key && prop.key.name) {
                usedStyles.add(prop.key.name);
              }
            });
          }
        }
      },

      // プログラム終了時に未使用スタイルを報告
      "Program:exit": function () {
        // 未使用スタイルを報告
        definedStyles.forEach((node, styleName) => {
          if (!usedStyles.has(styleName)) {
            context.report({
              node: node,
              message: `スタイル '${styleName}' は定義されていますが使用されていません。`,
            });
          }
        });
      },
    };
  },
};

export default noUnusedStylesRule;
