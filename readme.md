# xo-action

> GitHub Action ❤️ JavaScript happiness style linter


## Usage
To use the action simply add the following lines to your `.github/workflows/main.yml`.

```yaml
- name: xo
  uses: stoe/xo-action@master
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```


## License

MIT © [Stefan Stölzle](https://github.com/stoe)
