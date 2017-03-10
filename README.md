# uncork

SSH-over-HTTPS proxy that works like Unix `corkscrew`.

# Install

`npm install uncork -g` to install `uncork` globally on your system.

# Run

> Before running `uncork`, make sure your proxy is set in environment variable as either `HTTPS_PROXY` or `HTTP_PROXY`.

Run `uncork 22 ssh.github.com:443` to start `uncork` server on port 22 and forward to ssh.github.com:443.

```
SSH-over-HTTPS proxy 1.0.0

- Listening on port 22
- Will connect to HTTPS proxy at 127.0.0.1:8890
- Will tunnel traffic to destination at ssh.github.com:443
```

If your proxy server requires authentication, you can run `uncork 22 ssh.github.com:443 johndoe P@ssw0rd` to start `uncork` server with proxy authentication.

## Options via environment variables

You can also set options thru environment variables.

| Environment variable  | Description                             | Default              |
| --------------------- | --------------------------------------- | -------------------- |
| uncork_destination    | Destination hostname and port           | `ssh.github.com:443` |
| uncork_port           | Port number to listen to                | `22`                 |
| uncork_proxy_username | Username for proxy BASIC authentication | unset                |
| uncork_proxy_password | Password for proxy BASIC authentication | unset                |

# Contribution

Like us? [Star](https://github.com/compulim/uncork/stargazers) us.

Found a bug? [File](https://github.com/compulim/uncork/issues) us an issue.
