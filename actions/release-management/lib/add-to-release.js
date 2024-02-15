module.exports = createAddToRelease

var createReleaseCreator = require('./release-creator')
  , createExistingReleaseAdder = require('./existing-release-adder')

function createAddToRelease (serviceLocator) {

  var createNewRelease = createReleaseCreator(serviceLocator)
    , addToExistingRelease = createExistingReleaseAdder(serviceLocator)

  function addToRelease (pr, comment, releaseNameNumber, skipStatusChecks, cb) {
    var commentToAdd = null
    // don't run on release PRs
    if (pr.branch.indexOf('release/') === 0) return cb()
    // make sure branches start with the right names, otherwise releases will/can break
    if (pr.baseRef !== 'master') {
      commentToAdd = '@' + comment.author + ' Only Pull Requests based off of `master` ' +
        'can be merged into to a release. Please merge this Pull Request and then add the base branch to the release.'
      return pr.addComment(commentToAdd, cb)
    }
    if (!['feature/', 'feat/', 'bug/', 'fix/'].some(prefix => pr.branch.includes(prefix))) {
      commentToAdd = '@' + comment.author + ' Pull Request branches must start with `feature/`, `feat/`, ' +
        '`bug/` or `fix/`. Please recreate this Pull Request with a valid branch name.'
      return pr.addComment(commentToAdd, cb)
    }
    pr.getCurrentStatus(function (error, status) {
      if (error) return cb(error)
      var repoManager = null

      if (!skipStatusChecks && status.state !== 'success' && status.statuses.length > 0) {
        commentToAdd = '@' + comment.author + ' Not all status checks are passing.' +
           ' Ensure they are before adding to a release.'
        pr.addComment(commentToAdd, cb)
      } else {
        repoManager = serviceLocator.repoManager(pr.owner, pr.repo)
        if (!releaseNameNumber || typeof releaseNameNumber === 'string') {
          createNewRelease(releaseNameNumber, pr, comment, repoManager, cb)
        } else {
          addToExistingRelease(releaseNameNumber, pr, comment, repoManager, cb)
        }
      }
    })
  }

  return addToRelease

}
