// require('traceur-runtime');

import http from 'http';

import Koa from 'koa';
import Router from 'koa-trie-router';

// import stacks from 'koa-stacks';
// import bodyparser from 'koa-bodyparser';

import keccak from './keccak';

const keccakStore = {},
      jsonReferences = {},
      latest = [];

const port = process.env.port || 9999;

const app = new Koa(),
      router = new Router();

app.use((ctx, next) => {
  ctx.response.set('Access-Control-Allow-Origin', '*');
  return next();
});

router
  .get('/keccak/all', keccakGetAll)
  .get('/keccak/latest', keccakGetLatest)
  .get('/keccak/:hash', keccakGetHash)
  .get('/keccak/json/:key/:hash', keccakGetJsonKeyHash)
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
  const start = Math.max(0, latest.length - max),
        end = Math.max(0, Math.min(start + max, latest.length));
console.log(start, end);

  ctx.body = latest.slice(start, end).map(([_, hash]) => hash).join('\n');
}

async function keccakGetHash (ctx, next) // jshint ignore:line
{
  const {hash} = ctx.params,
        store = keccakStore[hash];

  console.log(hash, 'requested');

  if (store) {
    ctx.body = store[0];
  }
  else ctx.response.status = 404;

  return next();
}

async function keccakGetJsonKeyHash(ctx, next) // jshint ignore:line
{
  const {key, hash} = ctx.params,
        references = jsonReferences[hash];

  if (references) {
    const bucket = references[key];

    if (bucket) {
      ctx.body = JSON.stringify(bucket);
      return next();
    }
  }

  ctx.response.status = 404;
  return next();
}

async function keccakPostLookup (ctx, next) // jshint ignore:line
{
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

const maxLength = 100000;

async function keccakPostHash (ctx, next) // jshint ignore:line
{
  const {hash} = ctx.params;

  console.log(hash, 'posting');

  const {response, request, req} = ctx;

  await readAndStore(req, response); // jshint ignore:line

  return next();

  function readAndStore(req, response) {
    return new Promise((resolve, reject) => {
      const buffer = [];

      let totalLength = 0;

      req.on('data', dataHandler);
      req.on('end', endHandler);

      function dataHandler(data) {
        console.log('data', data);
        totalLength += data.length;

        if (totalLength > maxLength) {
          req.off('data', dataHandler);
          req.off('end', endHandler);
          reject('Too large! maxLength =', maxLength);
        }

        buffer.push(data);
      }

      function endHandler() {
        const data = Buffer.concat(buffer).toString('utf8');

        if (keccak(data) === hash) {
          try {
            const object = JSON.parse(data);

            if (Array.isArray(object)) {

            }
            else if (typeof object === 'object') {
              for (let key in object) {
                const value = object[key];

                if (typeof value === 'string') {
                  const match = value.match(/^keccak:([0-9a-f]{64})$/);
                  if (match) {
                    console.log('match', match);
                    const [_, referenceHash] = match,
                          referenceHashBucket = (jsonReferences[referenceHash] = jsonReferences[referenceHash] || {}),
                          keyBucket = (referenceHashBucket[key] = referenceHashBucket[key] || []);

                    keyBucket.push(hash);

                    console.dir(jsonReferences);
                  }
                }
              }
            }
          }
          catch (e) {}

          addToStore(keccakStore, hash, data);
          response.status = 200;
          console.log('stored', data);
        }
        else {
          response.status = 400;
        }

        console.log({data, hash});
        resolve();
      }
    });
  }
}

function addToStore(store, hash, data) {
  keccakStore[hash] = keccakStore[hash] || [];
  keccakStore[hash].push(data);
  latest.push([new Date().getTime(), hash]);
}