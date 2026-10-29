module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: ['./index.html','./services.html','./contact.html'],
      numberOfRuns: 1,
      settings: { chromeFlags:'--no-sandbox --disable-dev-shm-usage --disable-gpu --no-proxy-server' }
    },
    assert: { assertions: {
      'categories:performance':['error',{minScore:0.98}],
      'categories:accessibility':['error',{minScore:0.98}],
      'categories:best-practices':['error',{minScore:0.95}],
      'categories:seo':['error',{minScore:0.98}],
      'largest-contentful-paint':['error',{maxNumericValue:2500}],
      'cumulative-layout-shift':['error',{maxNumericValue:0.1}]
    } },
    upload:{target:'filesystem',outputDir:'./lighthouse-results'}
  }
};
