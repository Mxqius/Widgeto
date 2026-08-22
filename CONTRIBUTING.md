# Contributing to Widgeto

Thanks for taking a look. Widgeto is a small, personal-scale project — issues and pull requests are both welcome.

## Reporting a bug

Open an [issue](https://github.com/mxqius/widgeto/issues) with:

- What you did and what you expected to happen
- Your OS and Widgeto version (Settings → About has a "Copy diagnostic info" button)
- A screenshot if it's visual

## Working on the code

```bash
npm install
npm run app
```

See [README.md](README.md) for the full dev setup, architecture and source layout. There's no separate backend to run — the data layer lives inside the Rust core.

Before opening a PR:

```bash
npm run build        # type-checks and builds the frontend
cd src-tauri && cargo check
```

Keep PRs focused — one change per PR is easier to review than several bundled together. If you're planning something larger (a new widget, a new placement mode), opening an issue first to discuss the approach saves rework.

## License

By contributing, you agree your changes are licensed under the project's [MIT license](LICENSE).
