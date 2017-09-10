import fs from 'fs';
import path from 'path';

import http from 'http';

import Koa from 'koa';
import Router from 'koa-trie-router';

import keccak from './keccak';

if (!fs.existsSync('keccak')) fs.mkdirSync('keccak');

const keccakStore = {},
      jsonReferences = {},
      listeners = {},
      latestFile = fs.openSync('keccak/latest', 'a+'),
      latestStat = fs.statSync('keccak/latest'),
      latestBuffer = new Buffer(100 * (2 + 64 + new Date().getTime().toString().length)),
      latestRead = fs.readSync(latestFile, latestBuffer, 0, Math.min(latestBuffer.length, latestStat.size), Math.min(0, latestStat.size - Math.min(latestBuffer.length, latestStat.size))),
      latest = latestRead > 0 ? latestBuffer.toString().split('\n').slice(0, -1).map(line => line.split(' ')) : [];

const port = process.env.port || 9999;

const app = new Koa(),
      router = new Router();

app.use((ctx, next) => {
  ctx.response.set('Access-Control-Allow-Origin', '*');
  return next();
});

app.use((ctx, next) => {
  return next();
});

router
  .get('/keccak/all', keccakGetAll)
  .get('/keccak/latest', keccakGetLatest)
  .get('/keccak/:hash', keccakGetHash)
  .get('/keccak/json/:key/:hash', keccakGetJsonKeyHash)
  .post('/keccak', keccakPostLookup)
  .post('/keccak/:hash', keccakPostHash);

app.use(router.middleware());

app.listen(port);

console.log('HTTP server listing on port', port);

async function keccakGetAll (ctx, next) // jshint ignore:line
{
  ctx.body = keccakStore;
}

const max = 50;
async function keccakGetLatest (ctx, next) // jshint ignore:line
{
  const start = Math.max(0, latest.length - max),
        end = Math.max(0, Math.min(start + max, latest.length));

  ctx.body = latest.slice(start, end).map(([_, hash]) => hash).join('\n');

  return next();
}

async function keccakGetHash (ctx, next) // jshint ignore:line
{
  const {hash} = ctx.params,
        data = await lookupHash('keccak', hash); // jshint ignore:line

  console.log(hash, 'requested');

  if (data) {
    ctx.body = data;
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

  ctx.body = '[]';
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

        console.log({data, hash});

        if (keccak(data) === hash) {
          const references = classify(hash, data);

          addToStore(keccakStore, hash, data);
          addToFileSystem(hash, data)
            .then(() => addToLatest(hash))
            .then(() => scheduleUpdateNotifications({listeners}, references, data))
            .then(() => {
              response.status = 200;
              console.log('stored', data);
              resolve();
            });
        }
        else {
          response.status = 400;
          reject();
        }
      }
    });
  }
}

function lookupHash(type, hash) {
  const store = type === 'keccak' ? keccakStore : new Error('no other stores!');

  return new Promise((resolve, reject) => {
    const bucket = store[hash];

    if (bucket) {
      return resolve(bucket[0]);
    }

    readFile(path.join(type, ...splitHash(hash))).then(resolve).catch(reject);
  });
}

function addToFileSystem(hash, data) {
  const pieces = splitHash(hash);

  return createPiecesDirectories(pieces).then(path => writeFile(path, data));
}

function addToLatest(hash) {
  const time = new Date().getTime();
  latest.push([time, hash]);
  return new Promise((resolve, reject) => fs.write(latestFile, `${time} ${hash}\n`, error => error ? reject(error) : resolve()));
}

function splitHash(hash, width = 3) {
  const pieces = [];

  for (let i = 0; i < hash.length; i += width)
    pieces.push(hash.substr(i, width));

  return pieces;
}

function createPiecesDirectories(pieces) {
  return pieces.reduce((promise, piece) => {
    return promise.then(path => new Promise((resolve, reject) => {
      const nextPath = `${path}/${piece}`;

      exists(path)
        .then(() => resolve(nextPath))
        .catch(() => mkdir(path)
                       .then(() => resolve(nextPath))
                       .catch(reject));
    }));
  }, Promise.resolve('keccak'));
}

function exists(path) {
  return new Promise((resolve, reject) => fs.exists(path, exists => exists ? resolve() : reject()));
}

function mkdir(path) {
  return new Promise((resolve, reject) => fs.mkdir(path, error => error ? reject(error) : resolve()));
}

function readFile(path) {
  return new Promise((resolve, reject) => fs.readFile(path, (error, data) => error ? reject(error) : resolve(data.toString())));
}

function writeFile(path, data) {
  return new Promise((resolve, reject) => fs.writeFile(path, data, error => error ? reject(error) : resolve()));
}

function addToStore(store, hash, data) {
  keccakStore[hash] = keccakStore[hash] || [];
  keccakStore[hash].push(data);
}

function scheduleUpdateNotifications({listeners}, references, data) {
  references.forEach(obj => {
    for (let key in obj) {
      const [hash, referenceHash] = obj[key],
            listener = listeners[hash]; // may want referenceHash here instead, haven't confirmed

      if (listener) listener(referenceHash, data);
    }
  });
}

function classify(hash, data) {
  return tryClassifyJSON(hash, data, jsonReferences);
}

function tryClassifyJSON(hash, data, jsonReferences) {
  try {
    const object = JSON.parse(data),
          references = [];

    console.log('try classify', object);

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
            references.push({[key]: [hash, referenceHash]});

            console.dir(jsonReferences);
          }
        }
      }
    }
    return references;
  }
  catch (e) {console.log('error classifying', e);}
}