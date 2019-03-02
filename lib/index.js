"use strict";

const es = require("electrode-server");
const fs = require("fs");
const Stream = require("stream");
const Munchy = require("munchy");

async function start() {
  const server = await es({
    plugins: {
      good: {
        module: "good",
        options: {
          reporters: {
            myConsoleReporter: [
              {
                module: "good-console"
              },
              "stdout"
            ]
          }
        }
      }
    }
  });

  const getResponseOutput = (req, delay = 2000) => {
    const output = new Stream.PassThrough();
    const chunks = [
      `<h1>Hello</h1>`,
      `<h1>What's your name?</h1>`,
      `<h1>Nice to meet you, I am Hapi.</h1>`,
      `<h1>Hapi to be streaming with you.</h1>`,
      `<h1>Bye, have a nice day.</h1>`
    ];

    let ix = 0;
    const interval = setInterval(() => output.write("."), 100);

    let fail = -1;

    if (req.query.fail) {
      fail = parseInt(req.query.fail);
    }

    const send = () => {
      req.log([], `sending ${ix} ${chunks[ix]}`);
      output.write(chunks[ix++]);
      if (fail !== undefined && ix === fail) {
        clearInterval(interval);
        process.nextTick(() => output.emit("error"));
      } else {
        if (ix === chunks.length) {
          clearInterval(interval);
          output.end();
        } else {
          setTimeout(send, delay);
        }
      }
    };

    process.nextTick(() => send());

    return output;
  };

  server.route({
    method: "get",
    path: "/",
    handler: async (req, h) => {
      const data = getResponseOutput(req);
      const munchy = new Munchy();

      munchy.munch(`<html><head></head><body>`, data, `</body></html>\n`, null);

      h.state("START_TIME", `${Date.now()}`);

      return h.response(munchy);
    }
  });

  server.route({
    method: "get",
    path: "/multi",
    handler: async (req, h) => {
      const munchy = new Munchy();

      munchy.munch(
        `<html><head></head><body>`,
        getResponseOutput(req, 1000),
        getResponseOutput(req, 1000),
        `</body></html>\n`,
        null
      );

      h.state("START_TIME", `${Date.now()}`);

      return h.response(munchy);
    }
  });

  server.ext("onPreResponse", async (req, h) => {
    req.log([], "onPreResponse");
    h.state("PRE_RESP_TIME", `${Date.now()}`);
    return h.continue;
  });
}

start();
