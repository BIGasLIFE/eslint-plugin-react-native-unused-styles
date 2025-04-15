/**
 * @fileoverview Tests for no-unused-styles rule.
 */

import { RuleTester } from "eslint";
import rule from "../../rules/no-unused-styles";

// テスト設定
const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
});

// テスト実行
ruleTester.run("no-unused-styles", rule, {
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
