#!/usr/bin/env node

'use strict';

const PORT = process.argv[2] || process.env.uncork_port || 22;
const USERNAME = process.argv[4] || process.env.uncork_proxy_username;
const PASSWORD = process.argv[5] || process.env.uncork_proxy_password;
const DESTINATION = process.argv[3] || process.env.uncork_destination || 'ssh.github.com:443';
const { HTTP_PROXY, HTTPS_PROXY } = process.env;

const http = require('http');
const net = require('net');
const url = require('url');
let packageJSON = {}

try {
  packageJSON = require('./package.json');
} catch (err) {}

function main() {
  if (!HTTP_PROXY && !HTTPS_PROXY) {
    console.log('You must either set environment HTTP_PROXY or HTTPS_PROXY.');
    process.exit(-1);
  }

  const proxyUrl = url.parse(HTTPS_PROXY || HTTP_PROXY);

  net.createServer(client => {
    const startTime = Date.now();
    const tunnel = net.connect({
      host: proxyUrl.hostname,
      port: proxyUrl.port
    }, () => {
      console.log(`--- Connected to proxy at ${ proxyUrl.hostname }:${ proxyUrl.port }`);

      let req = `CONNECT ${ DESTINATION } HTTP/1.1\nHost: ${ DESTINATION }\n`;
      const proxyAuthorization = USERNAME && PASSWORD && new Buffer(`${ USERNAME }:${ PASSWORD }`).toString('base64');

      if (proxyAuthorization) {
        req += `Proxy-Authorization: Basic ${ proxyAuthorization }\n`;
      }

      req += '\n';

      tunnel.write(req);
      process.stdout.write(req.replace(proxyAuthorization, '*'));

      let responseHandler = data => {
        let handshaken;

        for (let i = 0, l = data.length - 3; i < l; i++) {
          if (data.readInt32BE(i) === 0x0D0A0D0A) {
            process.stdout.write(data.slice(0, i + 3));
            client.write(data.slice(i + 3));
            tunnel.pipe(client);
            client.pipe(tunnel);
            tunnel.removeListener('data', responseHandler);

            console.log(`--- Tunnel to ${ DESTINATION } has established`);
            handshaken = true;

            break;
          }
        }

        !handshaken && process.stdout.write(data);
      };

      tunnel
        .on('data', responseHandler)
        .on('end', () => {
          console.log(`--- Connection closed after ${ formatSeconds(Date.now() - startTime) } seconds`);
          client.end();
        })
        .on('error', err => {
          console.log(`--- Connection error "${ err.message }", after ${ formatSeconds(Date.now() - startTime) } seconds`);
        });
    });

    console.log(`--- Connecting to proxy at ${ proxyUrl.hostname }:${ proxyUrl.port }`);
  }).listen(PORT, () => {
    console.log(`SSH-over-HTTPS proxy ${ packageJSON.version || '' }\n`);
    console.log(`- Listening on port ${ PORT }`);
    console.log(`- Will connect to HTTPS proxy at ${ proxyUrl.hostname }:${ proxyUrl.port }`);
    USERNAME && PASSWORD && console.log(`- Will authenticate on proxy as "${ USERNAME }"`);
    console.log(`- Will tunnel traffic to destination at ${ DESTINATION }\n`);
  });
}

function formatSeconds(milliseconds) {
  return (milliseconds / 1000).toFixed(1)
}

main();
