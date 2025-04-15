import noUnusedStylesRule from "./rules/no-unused-styles";

export default {
  rules: {
    "no-unused-styles": noUnusedStylesRule,
  },
  configs: {
    recommended: {
      plugins: ["react-native-unused-styles"],
      rules: {
        "react-native-unused-styles/no-unused-styles": "warn",
      },
    },
  },
};
