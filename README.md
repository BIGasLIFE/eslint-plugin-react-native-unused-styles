# eslint-plugin-react-native-unused-styles

An ESLint plugin that detects style-related issues in React Native.

## Installation

```bash
npm install eslint eslint-plugin-react-native-unused-styles --save-dev
```

## Configuration

### ESLint Flat Config

```js
// eslint.config.mjs
import { defineConfig } from "eslint/config";
import reactNativeUnusedStyles from "eslint-plugin-react-native-unused-styles";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  reactNativeUnusedStyles.configs.recommended,
]);
```

## Rules

### no-unused-styles

SDetects styles defined with StyleSheet.create that are not used in the component.
Remove unused styles to keep your code clean.

```jsx
// ❌ Bad
const styles = StyleSheet.create({
  container: { flex: 1 },
  unused: { margin: 10 }, // Unused
});

return <View style={styles.container} />;

// ✅ Good
const styles = StyleSheet.create({
  container: { flex: 1 },
});

return <View style={styles.container} />;
```
