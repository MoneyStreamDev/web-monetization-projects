# Web Monetization Projects

[![Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)
[![CircleCI](https://circleci.com/gh/coilhq/web-monetization/tree/master.svg?style=svg&circle-token=fe496c364cbfce5bea2c0ec7b877f925db4e1ddf)](https://circleci.com/gh/coilhq/web-monetization/tree/master)

## Development Process

Ultimately we want `master` branch to be in a 'good' state at all times, with good test
coverage so we can practice CD.

However, currently there are known bugs, very little automated tests and the code will
need some restructuring to get to that point. So until that time, **we must do manual
testing before release**, as it's too much of an impediment to run through the full
manual release checklist on each PR/commit.

Till then:

- **do not assume master branch is in a good state** !
  - Go through the release checklist carefully! (see the checklist in the extension [readme](packages/coil-extension/README.md#release-checklist))

## Setting up dev environment

The Web-Monetization monorepo uses yarn, so you need to install it using npm or your package manager:

```sh
npm install -g yarn
# OR
brew install yarn
```

Clone and setup the dev env.

```sh
git clone git@github.com:coilhq/web-monetization.git
yarn
```

## Why Vanilla Prettier ?

We used prettier-standard (based on prettierx, a fork of prettier) but found that it
was easier to find up-to-date editor/eslint integrations for the mainline prettier
and just set the [.prettierrc](./.prettierrc) options to match prettier-standard as
closely as possible (no semicolon, single-quoted strings etc).

The one main difference is the lack of a space before parentheses in function declarations.
e.g.

```
// There *SHOULD* be a space before the parens here
function prettierStandard () {}
// maybe prettier was run on this markdown :)
```

vs

```typescript
function prettier() {}
```

This is not a big deal when prettier is run before commit and enforced in the CI etc.

## Repository Structure

This repository is managed using lerna, yarn and typescript project references, with some custom code to
generate consistent package.json/tsconfig.build.json/etc and src/test folder structure.
See the [coil-monorepo-upkeep](packages/coil-monorepo-upkeep) folder for details

## Development workflow

The root [tsconfig.json](tsconfig.json) has all the `paths` configured so refactoring/navigation
works across package boundaries, going directly to the source files rather than the declarations.

It looks at the entire monorepo as one set of sources, yet is configured to not actually emit any source.
It is purely for the purposes of the IDE.

It is intended that the whole monorepo be opened in the editor/IDE.

To build the source, one must use each individual package's `tsconfig.build.json`.
The root has a [tsconfig.references.json](tsconfig.references.json) which has `{"path": "...}`
links to all the project leaf nodes. Each package with dependencies on other packages also has these
links automatically generated by `yarn upkeep` via data output from the `lerna list` command.
For example, check the coil-extension [tsconfig.build.json](./packages/coil-extension/tsconfig.build.json)

## Jest/Babel Usage For Speedier Tests

TypeScript is great!

But when the editor is already set up to check types and CI also it's not
strictly necessary to do so when running tests. In fact, it can just get in the
way of a productive edit/compile/test loop.

You can create a file `./jest.config.local.js` file which will be read by the
[default jest config](./jest.config.js)

```javascript
module.exports = function configure(config) {
  // Don't use the ts-jest preset
  delete config.preset
}
```

### But it's still slow!?

At the time of writing, Jest 24 was struggling with mysterious
performance issues, primarily showing up on OSX

Experiment with the jest `-i/--runInBand` option which will just run tests
serially in a single worker. This can often make things drastically faster.

Some editors offer the ability to run scoped tests which also seems to
run everything in a single worker when only one file is in scope.

### Watch the root repo

```
yarn build:ts --watch --verbose

```
