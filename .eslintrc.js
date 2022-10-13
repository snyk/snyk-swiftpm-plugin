module.exports = {
  settings: { cache: true },
  parser: '@typescript-eslint/parser',
  // Pending https://github.com/typescript-eslint/typescript-eslint/issues/389
  // parserOptions: {
  //   project: './tsconfig.json',
  // },
  env: {
    node: true,
    es6: true,
    jest: true,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/indent': 'off',

    // non-null assertions compromise the type safety somewhat, but many
    // our types are still imprecisely defined and we don't use noImplicitAny
    // anyway, so for the time being assertions are allowed
    '@typescript-eslint/no-non-null-assertion': 1,

    '@typescript-eslint/no-var-requires': 0,
    '@typescript-eslint/no-use-before-define': 0,
    'no-prototype-builtins': 0,
    'require-atomic-updates': 0,
  },
};
