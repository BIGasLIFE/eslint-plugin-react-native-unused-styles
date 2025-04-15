# eslint-plugin-react-native-unused-styles

React Native のスタイル関連の問題を検出する ESLint プラグイン

## インストール

```bash
npm install eslint eslint-plugin-react-native-unused-styles --save-dev
```

## 設定

### ESLint Flat Config (推奨)

```js
// eslint.config.js
import reactNativeUnusedStyles from "eslint-plugin-react-native-unused-styles";

export default [
  reactNativeUnusedStyles.configs.recommended,
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    languageOptions: {
      // 必要な言語オプション
    },
  },
];
```

### 従来の設定 (.eslintrc.js)

```js
module.exports = {
  plugins: ["react-native-unused-styles"],
  rules: {
    "react-native-unused-styles/no-unused-styles": "warn",
  },
};
```

## ルール

### no-unused-styles

StyleSheet.create で定義されたが、コンポーネント内で使用されていないスタイルを検出します。

不要なスタイルを削除して、コードをクリーンに保ちます。

```jsx
// ❌ Bad
const styles = StyleSheet.create({
  container: { flex: 1 },
  unused: { margin: 10 }, // 使用されていない
});

return <View style={styles.container} />;

// ✅ Good
const styles = StyleSheet.create({
  container: { flex: 1 },
});

return <View style={styles.container} />;
```
