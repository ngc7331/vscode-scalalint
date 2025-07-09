# vscode-scalalint

## Features

This extension uses multiple backends to provide linting for Scala code in VS Code.

- [x] [scalastyle](https://www.scalastyle.org/)
- [ ] ...

It can automatically download those backends. For example, when you open a scala project for the first time after installing the extension, you will be prompted to download the scalastyle backend, just click "Yes" to proceed.

## Requirements

Each backend may have its own requirements.

- scalastyle
  - Java runtime environment
  - A `scalastyle-config.xml` file in your workspace root

## Extension Settings

- `scalalint.runOnSave`: If set to `true`, the extension will run scalastyle on every file save. Default is `true`.
- `scalalint.scalastyle.configFile`: Path to the `scalastyle-config.xml` file. Default is `./scalastyle-config.xml`, here `.` refers to the workspace root directory. Please refer to the [scalastyle documentation](https://www.scalastyle.org/) for more details on how to configure this file.

## Commands

- `scalalint.run`: Run scalastyle on the current file.

## Known Issues

None

## Release Notes

Refer to [CHANGELOG](./CHANGELOG.md) file for detail.
