#!/usr/bin/env node

'use strict';

const PORT = process.argv[2] || process.env.uncork_port || 22;
const USERNAME = process.argv[4] || process.env.uncork_proxy_username;
const PASSWORD = process.argv[5] || process.env.uncork_proxy_password;
const DESTINATION = process.argv[3] || process.env.uncork_destination || 'ssh.github.com:443';
const { HTTP_PROXY, HTTPS_PROXY } = process.env;

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

    client.on('error', err => {
      console.log(`--- Client connection error "${ err.message }", after ${ formatSeconds(Date.now() - startTime) } seconds`);
      tunnel.end();
    });

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

      let welcome = new Buffer(0);

      let responseHandler = data => {
        let handshaken;

        welcome = Buffer.concat([welcome, data]);

        for (let i = 0, l = welcome.length - 3; i < l; i++) {
          if (welcome.readInt32BE(i) === 0x0D0A0D0A) {
            tunnel.removeListener('data', responseHandler);
            process.stdout.write(welcome.slice(0, i + 3));
            handshaken = true;

            if (/^HTTP\/1.1\s200\s/.test(welcome.toString())) {
              client.write(welcome.slice(i + 3));
              tunnel.pipe(client);
              client.pipe(tunnel);
              welcome = null;

              console.log(`--- Tunnel to ${ DESTINATION } has established`);
            } else {
              console.log(`--- Failed to connect to ${ DESTINATION }`);
              client.end();
              tunnel.end();
            }

            break;
          }
        }

        !handshaken && process.stdout.write(welcome);
      };

      tunnel
        .on('data', responseHandler)
        .on('end', () => {
          console.log(`--- Connection closed after ${ formatSeconds(Date.now() - startTime) } seconds`);
          client.end();
        })
    }).on('error', err => {
      console.log(`--- Tunnel connection error "${ err.message }", after ${ formatSeconds(Date.now() - startTime) } seconds`);
      client.end();
    });

    console.log(`--- Connecting to proxy at ${ proxyUrl.hostname }:${ proxyUrl.port }`);
  }).on('error', err => {
    console.log(`--- Server listen error ${ err.message }`);
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
