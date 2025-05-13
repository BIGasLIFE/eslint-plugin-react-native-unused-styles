/**
 * @fileoverview Tests for no-unused-styles rule.
 */

import { RuleTester } from "eslint";
import { noUnusedStylesRule } from "../../rules/no-unused-styles.js";
import path from "path";

// テスト設定
const ruleTester = new RuleTester({
  parser: path.resolve(
    __dirname,
    "../../../node_modules/@typescript-eslint/parser/dist"
  ),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
});

// テスト実行
ruleTester.run("no-unused-styles", noUnusedStylesRule, {
  valid: [
    // 有効なケース - スタイルが使用されている
    {
      code: `
        import { StyleSheet } from 'react-native';
        
        const Component = () => {
          return <View style={styles.container} />;
        };
        
        const styles = StyleSheet.create({
          container: {
            flex: 1,
            backgroundColor: 'white',
          },
        });
      `,
    },
    // 配列形式でのスタイル使用
    {
      code: `
        import { StyleSheet } from 'react-native';
        
        const Component = () => {
          return <View style={[styles.container, styles.padding]} />;
        };
        
        const styles = StyleSheet.create({
          container: {
            flex: 1,
          },
          padding: {
            padding: 10,
          },
        });
      `,
    },
    {
      code: `
        import { StyleSheet } from 'react-native';

        const getStyle = () => {
          return styles.container;
        };
        
        const Component = () => {
          return <View style={getStyle()} />;
        };
        
        const styles = StyleSheet.create({
          container: {
            flex: 1,
          },
        });
      `,
    },
  ],
  invalid: [
    // 無効なケース - 未使用のスタイル
    {
      code: `
        import { StyleSheet } from 'react-native';
        
        const Component = () => {
          return <View style={styles.container} />;
        };
        
        const styles = StyleSheet.create({
          container: {
            flex: 1,
          },
          unused: {
            margin: 10,
          },
        });
      `,
      errors: [
        {
          message: `スタイル 'unused' は定義されていますが使用されていません。`,
        },
      ],
    },
  ],
});
