// require('traceur-runtime');

import http from 'http';

import Koa from 'koa';
import Router from 'koa-trie-router';

// import stacks from 'koa-stacks';
// import bodyparser from 'koa-bodyparser';

import keccak from './keccak';

const keccakStore = {};

const port = process.env.port || 9999;

const app = new Koa(),
      router = new Router();

router
  .get('/keccak/:hash', keccakGet)
  .post('/keccak/:hash', keccakPost);

app.use(router.middleware());

app.listen(port);

console.log('HTTP server listing on port', port);


async function keccakGet (ctx, next) // jshint ignore:line
{
  const {hash} = ctx.params,
        store = keccakStore[hash];

  console.log(hash, 'requested');

  if (store) {
    ctx.body = store[0];
  }
  else ctx.response.status = 404;
}

async function keccakPost (ctx, next) // jshint ignore:line
{
  const {hash} = ctx.params;

  console.log(hash, 'posting');

  const {response, request, req} = ctx;

  response.set('Access-Control-Allow-Origin', '*');

  await readAndStore(req, response); // jshint ignore:line

  return next();

  function readAndStore(req, response) {
    const buffer = [];
    let totalLength = 0;

    return new Promise((resolve, reject) => {
      req.on('data', data => {
        console.log('data', data);
        totalLength += data.length;
        buffer.push(data);
      });

      req.on('end', function() {
        const data = Buffer.concat(buffer).toString('utf8');

        if (keccak(data) === hash) {
          keccakStore[hash] = keccakStore[hash] || [];
          keccakStore[hash].push(data);
          response.status = 200;
          console.log('stored', data);
        }
        else {
          console.log('data didn\'t match hash!', response.finished);
          response.status = 400;
        }
        console.log(`${hash} done`);
        resolve();
      });

    });
  }
}