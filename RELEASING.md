# Releasing

## Every release

1. **Start from a clean, up-to-date `main`** with CI passing.
2. **Run everything locally:**

   ```sh
   npm ci
   npm run check          # typecheck, lint, format, data up to date, tests
   npm run test:tz        # tests in three time zones
   npm run build
   npm run check:package  # publint and are-the-types-wrong
   ```

3. **Choose the version** by [Semantic Versioning](https://semver.org/).
   Before 1.0, a breaking change raises the minor version (0.1 → 0.2).
   A data release, which publishes a new year (see below), is a minor
   release: dates in that year can move by a day from their projected
   values.
4. **Update `CHANGELOG.md`.** Rename `## [Unreleased]` to
   `## [x.y.z] - YYYY-MM-DD` and start a new empty `## [Unreleased]` above
   it.
5. **Set the version** without creating a tag yet:

   ```sh
   npm version x.y.z --no-git-tag-version
   ```

6. **Review what will be published:**

   ```sh
   npm publish --dry-run
   ```

   The tarball must hold only `dist/`, `README.md`, `LICENSE`, `NOTICE`
   and `package.json`. `prepublishOnly` runs the checks and the build
   again.

7. **Commit, tag and push:**

   ```sh
   git commit -am "release x.y.z"
   git tag vx.y.z
   git push && git push --tags
   ```

   Create the tag only after the commit has gone through: the workflow
   checks that the tag's `package.json` has the new version.

   The tag starts the **Release** workflow (`.github/workflows/release.yml`).
   It checks that the tag matches `package.json`, runs every check, and
   stages the package on npm with provenance. It also drafts the GitHub
   release with the changelog section as its notes. Follow it under the
   repository's **Actions** tab, or with `gh run watch`.

8. **Approve the staged version.** It is not public until you do:

   ```sh
   npm stage list bikram-sambat-date   # wait until it is no longer 'validating'
   npm stage approve <stage-id>        # confirms with your passkey
   ```

   or approve it on npmjs.com. `npm stage reject <stage-id>` discards it
   instead.

9. **Publish the GitHub release** that the workflow drafted:

   ```sh
   gh release edit vx.y.z --draft=false
   ```

10. **Confirm** that `npm view bikram-sambat-date version` shows the new
    version. A new version can take a few minutes to appear.

### If the workflow cannot stage

Stage from your machine instead, after step 7, then continue with step 8:

```sh
npm whoami          # if not logged in: npm login
npm stage publish
```

A version staged from your machine has no provenance. Create the GitHub
release by hand, as the workflow did not:

```sh
gh release create vx.y.z --verify-tag --title vx.y.z --notes-file <notes>
```

with the version's changelog section in `<notes>`.

### If the tag points at the wrong commit

When the workflow failed before staging, nothing was released, so the tag
can move:

```sh
git tag -f vx.y.z <commit>
git push --force origin vx.y.z
```

GitHub runs the workflow file from the tagged commit, so a fix to the
workflow also needs the tag moved to the commit with the fix.

## One-time setup: trusted publishing

The Release workflow authenticates to npm with GitHub's OIDC identity
instead of a token. npm has to be told to trust it, once:

1. On npmjs.com, open the package → **Settings** → **Trusted Publisher**.
2. Choose **GitHub Actions** and enter:
   - organization or user: `santosh-kafle`
   - repository: `bikram-sambat-date`
   - workflow filename: `release.yml`
   - environment: leave empty
3. Leave **publish directly** unticked. The workflow can then only stage
   versions, and each one waits for your approval: a compromised workflow
   cannot publish on its own. A plain `npm publish` from the workflow fails
   with `E403 OIDC permission denied for this action`.
4. Save, and check that the publisher is listed. Then, under **Publishing
   access**, choose **Require two-factor authentication and disallow
   tokens**, so no token, leaked or not, can publish the package.

If the workflow's publish step fails with `E404 Not Found - PUT`, npm did
not accept the workflow as a trusted publisher: check the fields above.

## Every year: publishing a new calendar year

The Nepal Panchanga Nirnayak Samiti approves each year's calendar a few
months before Baisakh. Until then the year is projected; once it is out,
it should become published in a release, before the year begins in
mid-April if possible.

1. Follow
   [adding a year](docs/data-sources.md#adding-a-year-when-a-new-calendar-is-published):
   fetch the reference, raise `maxYear`, run `npm run data:build` and
   `npm run data:calibrate`, and spot-check dates against a printed patro.
2. Read `data/ACCURACY.md` and `data/REPORT.md` for the new year:
   - Which of its month starts did the projection get wrong? Each miss
     should be one that was flagged `uncertain`.
   - If calibration fails because a miss fell outside the margin, the
     projection needs another look; see
     [docs/projection.md](docs/projection.md#calibration).
3. In the changelog, under **Changed**, note that the year moved from
   projected to published, and list any month starts that moved.
4. Release as above.
