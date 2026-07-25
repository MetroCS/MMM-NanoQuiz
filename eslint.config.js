export default [
    {
        files: ["**/*.js"],
        ignores: ["node_modules/**"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                document: "readonly",
                Log: "readonly",
                Module: "readonly"
            }
        },
        rules: {
            "no-undef": "error",
            "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
            "prefer-const": "error",
            "eqeqeq": ["error", "always"],
            "curly": ["error", "all"]
        }
    }
];
