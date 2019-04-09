# xo-action

> ❤️ JavaScript happiness style linter GitHub Action


## Usage
To use the action simply add the following lines to your `.github/main.workflow`.

```hcl
action "xo" {
  uses = "stoe/xo-action@master"
  secrets = ["GITHUB_TOKEN"]
}
```


## License [![license](https://img.shields.io/github/license/stoe/xo-action.svg)](https://github.com/stoe/xo-action/blob/master/license)

MIT © [Stefan Stölzle](https://github.com/stoe)
