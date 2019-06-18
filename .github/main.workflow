workflow "Test my code" {
  on = "push"
  resolves = ["npm test"]
}

action "npm install" {
  uses = "docker://node:10-alpine"
  runs = "npm"
  args = "install"
}

action "npm test" {
  needs = "npm install"
  uses = "docker://node:10-alpine"
  runs = "npm"
  args = "test"
}
