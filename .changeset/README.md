# Changesets

Every pull request that changes the library (`src/`, `android/src/`, `ios/` or `expo-module.config.json`) needs a changeset: a short note saying what changed and whether it's a patch, minor or major release. CI fails without one.

```sh
npm run changeset
```

Pick the bump, write one line for the CHANGELOG, and commit the file it creates here. When the pull request is merged, the release workflow collects these into a "Version packages" pull request, and merging that publishes to npm.
