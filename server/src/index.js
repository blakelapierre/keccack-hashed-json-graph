// require('traceur-runtime');

import http from 'http';

import Koa from 'koa';
import Router from 'koa-trie-router';

// import stacks from 'koa-stacks';
// import bodyparser from 'koa-bodyparser';

import keccak from './keccak';

const keccakStore = {},
      latest = [];

const port = process.env.port || 9999;

const app = new Koa(),
      router = new Router();

router
  .get('/keccak/all', keccakGetAll)
  .get('/keccak/latest', keccakGetLatest)
  .get('/keccak/:hash', keccakGetHash)
  .post('/keccak/lookup', keccakPostLookup)
  .post('/keccak/:hash', keccakPostHash);

app.use(router.middleware());

app.listen(port);

console.log('HTTP server listing on port', port);

async function keccakGetAll (ctx, next) // jshint ignore:line
{

}

const max = 50;
async function keccakGetLatest (ctx, next) // jshint ignore:line
{
  ctx.response.set('Access-Control-Allow-Origin', '*');

  const start = Math.max(0, latest.length - max),
        end = Math.max(0, Math.min(start + max, latest.length));
console.log(start, end);

  ctx.body = latest.slice(start, end).map(([_, hash]) => hash).join('\n');
}

async function keccakGetHash (ctx, next) // jshint ignore:line
{
  ctx.response.set('Access-Control-Allow-Origin', '*');

  const {hash} = ctx.params,
        store = keccakStore[hash];

  console.log(hash, 'requested');

  if (store) {
    ctx.body = store[0];
  }
  else ctx.response.status = 404;

  return next();
}

async function keccakPostLookup (ctx, next) // jshint ignore:line
{
  ctx.response.set('Access-Control-Allow-Origin', '*');

  await new Promise((resolve, reject) => { // jshint ignore:line
    const {req, response} = ctx;

    req.on('data', data => {
      console.log('lookup', data, response);

      response.body = data.toString('utf16le').split('\n').reduce((body, hash) => {
        console.log(hash, body);
        return `${body}${hash} ${keccakStore[hash]}\n`;
      }, response.body);
      response.status = 200;
    });

    req.on('end', resolve);
  });

  return next();
}

async function keccakPostHash (ctx, next) // jshint ignore:line
{
  const {hash} = ctx.params;

  console.log(hash, 'posting');

  const {response, request, req} = ctx;

  response.set('Access-Control-Allow-Origin', '*');

  await readAndStore(req, response); // jshint ignore:line

  return next();

  function readAndStore(req, response) {
    return new Promise((resolve, reject) => {
      const buffer = [];

      let totalLength = 0;

      req.on('data', data => {
        console.log('data', data);
        totalLength += data.length;
        buffer.push(data);
      });

      req.on('end', function() {
        const data = Buffer.concat(buffer).toString('utf8');

        if (keccak(data) === hash) {
          addToStore(keccakStore, hash, data);
          response.status = 200;
          console.log('stored', data);
        }
        else {
          response.status = 400;
        }

        console.log({data, hash});
        resolve();
      });

    });
  }
}

function addToStore(store, hash, data) {
  keccakStore[hash] = keccakStore[hash] || [];
  keccakStore[hash].push(data);
  latest.push([new Date().getTime(), hash]);
}