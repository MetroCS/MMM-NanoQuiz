export default [
    {
        files: ["**/*.{js,mjs}"],
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
                NanoQuizAdapter: "readonly",
                AbortController: "readonly"
            }
        },
        rules: {
            "no-undef": "error",
            "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
            "prefer-const": "error",
            "eqeqeq": ["error", "always"],
            "curly": ["error", "all"]
        }
    },
    {
        files: ["bin/**/*.js", "src/cli/**/*.js"],
        languageOptions: {
            globals: {
                process: "readonly",
                console: "readonly"
            }
        }
    }
];
