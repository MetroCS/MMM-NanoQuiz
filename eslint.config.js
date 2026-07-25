export default [
    {
        files: ["**/*.js"],
        ignores: ["node_modules/**"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                document: "readonly",
                fetch: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                Log: "readonly",
                Module: "readonly",
                NanoQuizAdapter: "readonly"
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
