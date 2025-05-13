import noUnusedStylesRule from "./rules/no-unused-styles.js";

export default {
  configs: {
    recommended: {
      files: ["**/*.{jsx,tsx}"],
      plugins: {
        "react-native-unused-styles": noUnusedStylesRule,
      },
      rules: {
        "react-native-unused-styles/no-unused-styles": "warn",
      },
    },
  },
};
