# exso

Exsolvo - "to release".

An opinionated GitHub bot that aids you and your team in managing releases.

## Usage

### Feature PRs

All Feature PRs should have their branch prefixed with either `feature/`, `feat/`, `bug/` or `fix/`.

#### Mark as QAed

Add a comment to a PR which contains a 👍 to have the "QA Required" status set to successful.

Please note, you cannot thumb up your own PR and any subsequent changes to the PR will revert the status to pending and require another thumbs up.

#### Add to a Release Branch

To create a new release branch, you have a couple of options:

```
@bot add to release
```

This will create a new release with a random name.

```
@bot add to release phase-two
```

This will create a release named "phase-two".

In order to add to an existing release branch, you would use the Release PR number:

```
@bot add to release #37
```

This will add the PR to the Release PR with the number 37.

If conflicts were encountered when attempting to automatically merge a Feature PR into a Release PR, you will need to manually merge the branches and resolve the conflicts. Once the conflicts have been resolved, you will need to comment on the original PR:

```
@bot merged into release
```

This will mark the merge as successful and update the Release PR accordingly.

#### Remove from a Release Branch

TBC

### Release PRs

#### Ready for Staging

Once a Release PR contains all of the required Feature PRs, it can be made ready for staging:

```
@bot ready for staging
```

This will create a pre-release tag (e.g `v1.0.0-0`) for you. Once complete, a reply will be posted containing the tag to use in deployment.

#### On Staging

Once a tag has been successfully deployed to staging, comment on the Release PR with:

```
@bot on staging
```

This will update the Release PR and all of the Feature PRs within it to label them as "on-staging".

#### Ready for Production

When you would like the Release PR to go to production, just add a comment like:

```
@bot ready for production
```

This will generate and commit a changelog of all of the changes in the Release PR and provide you with a release tag (e.g `v1.0.0`) for you to deploy to production.

#### On Production

Once deployed to production comment on the Release PR with:

```
@bot on production
```

This will label the Release PR and all the Feature PRs within it with `on-production`.

Please note it is up to you to click the merge button to merge the Release PR into `master`. This should happen once you are happy with the production deployment.

Once merged into `master` the Release PR and all Feature PRs contained within it will be closed and their branches deleted automatically.

## Local Development

This project uses NodeJS 4.4.4 and npm.

Some configuration is required to run the bot locally:

`env.WEBHOOK_SECRET` - this can be absolutely any randomly generated secret

`env.GITHUB_TOKEN` - this must be a personal access token with the full `repo` scope.

`env.URL` - this will be the URL you are given from an `ngrok http 3000`, **without the trailing slash**.

Once you have the server running, head to the setup endpoint:

`/setup/:user/:repo`

e.g.

`https://d0a6-89-151-72-5.ngrok.io/setup/clocklimited/darkroom`

If successful, this should return `OK` and you will have a webhook configured in the repo.

Your local server is now configured to recieve webhooks from your repo.
