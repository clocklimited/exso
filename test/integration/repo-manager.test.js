var assert = require('assert')
  , nock = require('nock')
  , request = require('supertest')
  , logger = require('mc-logger')
  , createServiceLocator = require('service-locator')
  , signWebhookData = require('./helpers/sign-webhook-data')
  , bootstrap = require('../../bootstrap')
  , pushFixture = require('./webhooks/fixtures/push.json')
  , PullRequest = require('../../lib/models/pull-request')
  , Branch = require('../../lib/models/branch')
  , pullRequestFixture = require('./webhooks/fixtures/pull-request.json')['pull_request']
  , referenceFixture = require('./fixtures/reference.json')
  , serviceLocator = null

describe('Repo Manager', function () {

  beforeEach(function () {
    serviceLocator = createServiceLocator()
    serviceLocator.register('secrets', { webhookSecret: 'test', githubToken: 'test' })
    serviceLocator.register('config', { url: 'http://my.site' })
    serviceLocator.register('logger', logger)
  })

  function runTest (action, cb) {
    bootstrap(serviceLocator, [ action ], function (error, serviceLocator) {
      if (error) return cb(error)

      var fixture = pushFixture
      request(serviceLocator.server)
        .post('/github/webhook')
        .set('content-type', 'application/json')
        .set('X-GitHub-Delivery', '1')
        .set('X-Hub-Signature', signWebhookData(serviceLocator.secrets.webhookSecret, fixture))
        .set('X-GitHub-Event', 'push')
        .send(fixture)
        .expect(200)
        .end(function (error) {
          if (error) return cb(error)
        })
    })
  }

  describe('#getOpenPulls', function () {

    it('should return an array of PullRequest objects', function (done) {

      var action =
            { name: 'test'
            , actions:
              { push:
                { check: function (ghAction, branch, cb) {
                    cb(null, true)
                  }
                , exec: function (branch) {
                    serviceLocator.repoManager(branch.owner, branch.repo).getOpenPulls(function (error, pulls) {
                      if (error) return done(error)
                      assert.equal(pulls.length, 1)
                      assert.equal(pulls[0] instanceof PullRequest, true, 'not an instance of PullRequest')
                      assert.deepEqual(pulls[0].labels, [ 'my-label' ])
                      done()
                    })
                  }
                }
              }
            }

      nock('https://api.github.com')
        .get('/repos/microadam/exso-test/issues?state=open&per_page=100')
        .reply(200, [ { number: 11, labels: [ { name: 'my-label' } ] } ])

      nock('https://api.github.com')
        .get('/repos/microadam/exso-test/pulls?state=open&base=master&per_page=100')
        .reply(200, [ pullRequestFixture ])

      runTest(action, done)

    })

  })

  describe('#getPull', function () {

    it('should return a single PullRequest object', function (done) {
      var action =
            { name: 'test'
            , actions:
              { push:
                { check: function (ghAction, branch, cb) {
                    cb(null, true)
                  }
                , exec: function (branch) {
                    serviceLocator.repoManager(branch.owner, branch.repo).getPull(11, function (error, pull) {
                      if (error) return done(error)
                      assert.equal(pull instanceof PullRequest, true, 'not an instance of PullRequest')
                      assert.deepEqual(pull.labels, [ 'my-label' ])
                      done()
                    })
                  }
                }
              }
            }

      nock('https://api.github.com')
        .get('/repos/microadam/exso-test/pulls/11')
        .reply(200, pullRequestFixture)

      nock('https://api.github.com')
        .get('/repos/microadam/exso-test/issues/11')
        .reply(200, { labels: [ { name: 'my-label' } ] })

      runTest(action, done)
    })

  })

  describe('#createPull', function () {

    it('should create and return a single PullRequest object', function (done) {
      var action =
            { name: 'test'
            , actions:
              { push:
                { check: function (ghAction, branch, cb) {
                    cb(null, true)
                  }
                , exec: function (branch) {
                    var repoManager = serviceLocator.repoManager(branch.owner, branch.repo)
                    repoManager.createPull('title', 'body', 'release/test', function (error, pull) {
                      if (error) return done(error)
                      assert.equal(pull instanceof PullRequest, true, 'not an instance of PullRequest')
                      done()
                    })
                  }
                }
              }
            }

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/pulls'
        , { title: 'title'
          , body: 'body'
          , head: 'release/test'
          , base: 'master'
          })
        .reply(200, pullRequestFixture)

      runTest(action, done)
    })

  })

  describe('#getBranch', function () {

    it('should return a single Branch object', function (done) {
      var action =
            { name: 'test'
            , actions:
              { push:
                { check: function (ghAction, branch, cb) {
                    cb(null, true)
                  }
                , exec: function (branch) {
                    var repoManager = serviceLocator.repoManager(branch.owner, branch.repo)
                    repoManager.getBranch('release/test-bla', function (error, branch) {
                      if (error) return done(error)
                      assert.equal(branch instanceof Branch, true, 'not an instance of Branch')
                      assert.equal(branch.ref, 'refs/heads/release/test-bla')
                      assert.equal(branch.headSha, 'b0e588f7604018f90024ca9bc80f181cad2a2cfe')
                      assert.equal(branch.owner, 'microadam')
                      assert.equal(branch.repo, 'exso-test')
                      done()
                    })
                  }
                }
              }
            }

      nock('https://api.github.com')
        .get('/repos/microadam/exso-test/git/refs/heads%2Frelease%2Ftest-bla')
        .reply(200, referenceFixture)

      runTest(action, done)
    })

  })

  describe('#createBranch', function () {

    it('should create and return a single Branch object', function (done) {
      var action =
            { name: 'test'
            , actions:
              { push:
                { check: function (ghAction, branch, cb) {
                    cb(null, true)
                  }
                , exec: function (branch) {
                    var repoManager = serviceLocator.repoManager(branch.owner, branch.repo)
                      , sha = 'b0e588f7604018f90024ca9bc80f181cad2a2cfe'
                    repoManager.createBranch('release/test-bla', sha, function (error, branch) {
                      if (error) return done(error)
                      assert.equal(branch instanceof Branch, true, 'not an instance of Branch')
                      assert.equal(branch.ref, 'refs/heads/release/test-bla')
                      assert.equal(branch.headSha, 'b0e588f7604018f90024ca9bc80f181cad2a2cfe')
                      assert.equal(branch.owner, 'microadam')
                      assert.equal(branch.repo, 'exso-test')
                      done()
                    })
                  }
                }
              }
            }

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/git/refs'
        , { ref: 'refs/heads/release/test-bla'
          , sha: 'b0e588f7604018f90024ca9bc80f181cad2a2cfe'
          })
        .reply(200, referenceFixture)

      runTest(action, done)
    })

  })

  describe('#getTags', function () {

    it('should retrieve tags', function (done) {
      var action =
            { name: 'test'
            , actions:
              { push:
                { check: function (ghAction, branch, cb) {
                    cb(null, true)
                  }
                , exec: function (branch) {
                    var repoManager = serviceLocator.repoManager(branch.owner, branch.repo)
                    repoManager.getTags(done)
                  }
                }
              }
            }

      nock('https://api.github.com')
        .get('/repos/microadam/exso-test/tags?per_page=100')
        .reply(200)

      runTest(action, done)
    })

  })

  describe('#getCommit', function () {

    it('should retrieve commit', function (done) {
      var action =
            { name: 'test'
            , actions:
              { push:
                { check: function (ghAction, branch, cb) {
                    cb(null, true)
                  }
                , exec: function (branch) {
                    var repoManager = serviceLocator.repoManager(branch.owner, branch.repo)
                    repoManager.getCommit('abc123', done)
                  }
                }
              }
            }

      nock('https://api.github.com')
        .get('/repos/microadam/exso-test/git/commits/abc123')
        .reply(200)

      runTest(action, done)
    })

  })

  describe('#createTag', function () {

    it('should create a Tag', function (done) {
      var action =
            { name: 'test'
            , actions:
              { push:
                { check: function (ghAction, branch, cb) {
                    cb(null, true)
                  }
                , exec: function (branch) {
                    var repoManager = serviceLocator.repoManager(branch.owner, branch.repo)
                      , sha = 'b0e588f7604018f90024ca9bc80f181cad2a2cfe'
                    repoManager.createTag('v1.0.0', sha, done)
                  }
                }
              }
            }

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/git/refs'
        , { ref: 'refs/tags/v1.0.0'
          , sha: 'b0e588f7604018f90024ca9bc80f181cad2a2cfe'
          })
        .reply(200, referenceFixture)

      runTest(action, done)
    })

  })

  describe('#getFileContents', function () {

    it('should return decoded file contents and blobSha', function (done) {
      var action =
            { name: 'test'
            , actions:
              { push:
                { check: function (ghAction, branch, cb) {
                    cb(null, true)
                  }
                , exec: function (branch) {
                    var repoManager = serviceLocator.repoManager(branch.owner, branch.repo)
                    repoManager.getFileContents('package.json', 'master', function (error, contents, blobSha) {
                      if (error) return done(error)
                      assert.equal(contents, '{\n  "name": "exso-test",\n  "version":' +
                        ' "v2.0.0",\n  "dependencies": {}\n}\n')
                      assert.equal(blobSha, 'abc123')
                      done()
                    })
                  }
                }
              }
            }

      nock('https://api.github.com')
        .get('/repos/microadam/exso-test/contents/package.json?ref=master')
        .reply(200, { content: 'ewogICJuYW1lIjogImV4c28tdGVzdCIsCiAgInZlcnNp' +
          'b24iOiAidjIuMC4wIiwKICAiZGVwZW5kZW5jaWVzIjoge30KfQo', sha: 'abc123' })

      runTest(action, done)
    })

  })

  describe('#createFile', function () {

    it('should create a file', function (done) {
      var action =
            { name: 'test'
            , actions:
              { push:
                { check: function (ghAction, branch, cb) {
                    cb(null, true)
                  }
                , exec: function (branch) {
                    var repoManager = serviceLocator.repoManager(branch.owner, branch.repo)
                    repoManager.createFile('package.json', 'contents', 'msg', 'master', function (error, sha) {
                      if (error) return done(error)
                      assert.equal(sha, 'def456')
                      done()
                    })
                  }
                }
              }
            }

      nock('https://api.github.com')
        .put('/repos/microadam/exso-test/contents/package.json'
          , { message: 'msg'
            , content: 'Y29udGVudHM='
            , branch: 'master'
            })
        .reply(200, { commit: { sha: 'def456' } })

      runTest(action, done)
    })

  })

  describe('#updateFile', function () {

    it('should update a file', function (done) {
      var action =
            { name: 'test'
            , actions:
              { push:
                { check: function (ghAction, branch, cb) {
                    cb(null, true)
                  }
                , exec: function (branch) {
                    var repoManager = serviceLocator.repoManager(branch.owner, branch.repo)
                    repoManager.updateFile('package.json', 'contents', 'msg', 'master', 'abc123'
                    , function (error, sha) {

                      if (error) return done(error)
                      assert.equal(sha, 'def456')
                      done()
                    })
                  }
                }
              }
            }

      nock('https://api.github.com')
        .put('/repos/microadam/exso-test/contents/package.json'
          , { message: 'msg'
            , content: 'Y29udGVudHM='
            , branch: 'master'
            , sha: 'abc123'
            })
        .reply(200, { commit: { sha: 'def456' } })

      runTest(action, done)
    })

  })

  describe('#updateFiles', function () {

    it('should successfully update multiple files in a single commit on a branch', function (done) {
      var action =
            { name: 'test'
            , actions:
              { push:
                { check: function (ghAction, branch, cb) {
                    cb(null, true)
                  }
                , exec: function (branch) {
                    var repoManager = serviceLocator.repoManager(branch.owner, branch.repo)
                      , options =
                          { files: []
                          , commitMessage: 'commit message'
                          , baseSha: 'abc123'
                          , branch: 'feature/test'
                          }
                    options.files.push({ path: 'package.json', content: 'package.json' })
                    options.files.push({ path: 'npm-shrinkwrap.json', content: 'npm-shrinkwrap.json' })

                    repoManager.updateFiles(options, function (error, commitSha) {
                      if (error) return done(error)
                      assert.equal(commitSha, 'ghi789')
                      done()
                    })
                  }
                }
              }
            }

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/git/trees'
        , { tree:
            [ { mode: '100644'
              , type: 'blob'
              , path: 'package.json'
              , content: 'package.json'
              }
            , { mode: '100644'
              , type: 'blob'
              , path: 'npm-shrinkwrap.json'
              , content: 'npm-shrinkwrap.json'
              }
            ]
          , 'base_tree': 'abc123'
          })
        .reply(200, { sha: 'def456' })

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/git/commits'
        , { message: 'commit message'
          , tree: 'def456'
          , parents: [ 'abc123' ]
          })
        .reply(200, { sha: 'ghi789' })

      nock('https://api.github.com')
        .patch('/repos/microadam/exso-test/git/refs/heads%2Ffeature%2Ftest'
        , { sha: 'ghi789' })
        .reply(200)

      runTest(action, done)
    })

  })

  describe('#createInitialHook', function () {

    it('should create the initial hook', function (done) {
      var action =
            { name: 'test'
            , actions:
              { push:
                { check: function (ghAction, branch, cb) {
                    cb(null, true)
                  }
                , exec: function (branch) {
                    var repoManager = serviceLocator.repoManager(branch.owner, branch.repo)
                    repoManager.createInitialHook(done)
                  }
                }
              }
            }

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/hooks'
          , { config:
              { url: 'http://my.site/github/webhook'
              , 'content_type': 'json'
              , secret: 'test'
              }
            , events:
              [ 'push', 'pull_request', 'issue_comment', 'create'
              , 'pull_request_review', 'commit_comment'
              ]
            , active: true
            , name: 'web'
            })
        .reply(200)

      runTest(action, done)
    })

  })

  describe('#clearAllLabels', function () {

    it('should clear all the labels', function (done) {
      var action =
            { name: 'test'
            , actions:
              { push:
                { check: function (ghAction, branch, cb) {
                    cb(null, true)
                  }
                , exec: function (branch) {
                    var repoManager = serviceLocator.repoManager(branch.owner, branch.repo)
                    repoManager.clearAllLabels(done)
                  }
                }
              }
            }

      nock('https://api.github.com')
        .get('/repos/microadam/exso-test/labels')
        .reply(200, [ { name: 'test' }, { name: 'test-two' } ])

      nock('https://api.github.com')
        .delete('/repos/microadam/exso-test/labels/test')
        .reply(200)

      nock('https://api.github.com')
        .delete('/repos/microadam/exso-test/labels/test-two')
        .reply(200)

      runTest(action, done)
    })

  })

  describe('#createRequiredLabels', function () {

    it('should create all required labels', function (done) {
      var action =
            { name: 'test'
            , actions:
              { push:
                { check: function (ghAction, branch, cb) {
                    cb(null, true)
                  }
                , exec: function (branch) {
                    var repoManager = serviceLocator.repoManager(branch.owner, branch.repo)
                    repoManager.createRequiredLabels(done)
                  }
                }
              }
            }

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/labels'
          , { name: 'needs-master-merge', color: 'b60205' })
        .reply(200)

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/labels'
          , { name: 'qa-required', color: '1d76db' })
        .reply(200)

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/labels'
          , { name: 'release', color: 'd4c5f9' })
        .reply(200)

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/labels'
          , { name: 'ready-for-staging', color: 'fef2c0' })
        .reply(200)

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/labels'
          , { name: 'on-staging', color: 'fbca04' })
        .reply(200)

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/labels'
          , { name: 'on-staging--partial', color: 'd93f0b' })
        .reply(200)

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/labels'
          , { name: 'ready-for-production', color: 'c2e0c6' })
        .reply(200)

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/labels'
          , { name: 'on-production', color: '0e8a16' })
        .reply(200)

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/labels'
          , { name: 'semver/major', color: 'c5def5' })
        .reply(200)

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/labels'
          , { name: 'semver/minor', color: 'c5def5' })
        .reply(200)

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/labels'
          , { name: 'semver/patch', color: 'c5def5' })
        .reply(200)

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/labels'
          , { name: 'add-to-any-release', color: '33acbf' })
        .reply(200)

      nock('https://api.github.com')
        .post('/repos/microadam/exso-test/labels'
          , { name: 'add-to-next-release', color: 'baf265' })
        .reply(200)

      runTest(action, done)
    })

  })

  describe('#cleanupBranches', function () {

    it('should delete all branches that are merged into master', function (done) {
      var action =
            { name: 'test'
            , actions:
              { push:
                { check: function (ghAction, branch, cb) {
                    cb(null, true)
                  }
                , exec: function (branch) {
                    var repoManager = serviceLocator.repoManager(branch.owner, branch.repo)
                    repoManager.cleanupBranches(done)
                  }
                }
              }
            }

      nock('https://api.github.com')
        .get('/repos/microadam/exso-test/git/refs?per_page=100')
        .reply(200,
          [ { ref: 'refs/heads/master', object: { sha: 'abc123' } }
          , { ref: 'refs/heads/test', object: { sha: 'def456' } }
          , { ref: 'refs/heads/feature/a', object: { sha: 'ghi789' } }
          , { ref: 'refs/tags/1.0.0' }
          , { ref: 'refs/pull/54' }
          ])

      nock('https://api.github.com')
        .get('/repos/microadam/exso-test/compare/abc123...def456')
        .reply(200, { 'ahead_by': 1 })

      nock('https://api.github.com')
        .get('/repos/microadam/exso-test/compare/abc123...ghi789')
        .reply(200, { 'ahead_by': 0 })

      nock('https://api.github.com')
        .delete('/repos/microadam/exso-test/git/refs/heads%2Ffeature%2Fa')
        .reply(200)

      runTest(action, done)
    })

  })

})
