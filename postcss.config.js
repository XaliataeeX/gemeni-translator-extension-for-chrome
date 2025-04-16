module.exports = {
  plugins: [
    'postcss-import',
    ['postcss-preset-env', {
      stage: 1,
      features: {
        'nesting-rules': true,
        'color-function': true,
        'custom-media-queries': true,
        'gap-properties': true,
        'custom-properties': true,
        'place-properties': true,
        'logical-properties-and-values': true,
        'media-query-ranges': true
      },
      autoprefixer: {
        grid: true,
        flexbox: 'no-2009'
      }
    }],
    ['cssnano', {
      preset: ['default', {
        discardComments: { removeAll: true },
        colormin: true,
        convertValues: true,
        minifyGradients: true,
        minifyParams: true,
        normalizeWhitespace: false
      }]
    }]
  ]
};