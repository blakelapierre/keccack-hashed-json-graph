import fs from 'fs';
import path from 'path';
import {Readable} from 'stream';

import http from 'http';

import Koa from 'koa';
import Router from 'koa-trie-router';

import keccak from './keccak';

const hashFnName = 'keccak';

if (!fs.existsSync(hashFnName)) fs.mkdirSync(hashFnName);

const keccakStore = {},
      jsonHashReferences = {},
      jsonKeyReferences = {},
      listeners = {},
      latestFile = fs.openSync(`${hashFnName}/latest`, 'a+'),
      latestStat = fs.statSync(`${hashFnName}/latest`),
      latestBuffer = new Buffer(100 * (2 + 64 + new Date().getTime().toString().length)),
      latestRead = fs.readSync(latestFile, latestBuffer, 0, Math.min(latestBuffer.length, latestStat.size), Math.min(0, latestStat.size - Math.min(latestBuffer.length, latestStat.size))),
      latest = latestRead > 0 ? latestBuffer.toString().split('\n').slice(0, -1).reverse().map(line => line.split(' ')) : [];

const port = process.env.port || 9999;

const app = new Koa(),
      router = new Router();

attachRoutes(router, generateRoutes(), 'keccak');

app.use(allowAllOrigins);
app.use(router.middleware());

app.listen(port);

console.log('HTTP server listing on port', port);

function allowAllOrigins(ctx, next) {
  ctx.response.set('Access-Control-Allow-Origin', '*');
  return next();
}

function attachRoutes(router, allRoutes, hashFnName) {
  for (let method in allRoutes) {
    const r = router[method],
          routes = allRoutes[method];

    for (let path in routes) {
      r(`/${hashFnName}/${path}`, routes[path]);
    }
  }
}

function generateRoutes() {
  const max = 50;
  const maxLength = 100000;

  return ({
    'get': {
      'all': getAll,
      'latest': getLatest,
      'json/:key': getJsonKey,
      'json/:key/:value': getJsonKeyValue, 
      'subscribe/latest': getSubscribeLatest,
      'subscribe/json/:key': getSubscribeJsonKey,
      'subscribe/json/:key/:value': getSubscribeJsonKeyValue,
      ':hash': getHash,
      ':hash/json': getHashJson,
      ':hash/json/:key': getHashJsonKey //,
      // ':hash/new/json/:key': getHashNewJsonKey
    },
    'post': {
      '': postLookup,
      ':hash': postHash
    }
  });

  async function getAll (ctx, next) // jshint ignore:line
  {
    ctx.body = keccakStore; // uh, wut?

    return next();
  }

  async function getLatest (ctx, next) // jshint ignore:line
  {
    const start = 0,
          end = Math.min(50, list.length);

    ctx.body = latest.slice(start, end).map(([_, hash]) => hash).join('\n');

    return next();
  }

  async function getSubscribeLatest(ctx, next) // jshint ignore:line
  {
    ctx.response.set('Content-Type', 'application/octet-stream');
    ctx.response.set('Cache-Control', 'no-cache');
    ctx.status = 200;

    let count = 0,
        send = true;

    console.log('latest subscriber');

    ctx.res.on('close', () => {send = false; console.log('subscriber left');});

    // while (++count < 50)
    while (send) {
      const data = await getLatestPromise(); // jshint ignore:line
      console.log('sending latest', data);
      if (send) ctx.res.write(data);
    }

    console.log('done with subscribe');

    return next();
  }

  async function getJsonKey(ctx, next) // jshint ignore:line
  {
    const {response, params: {key}} = ctx;
    
    response.set('Content-Type', 'application/octet-stream');
    response.set('Cache-Control', 'no-cache');

    ctx.status = 200;

    const references = jsonKeyReferences[key];
    if (references) {

      const list = references,
            start = 0,
            end = Math.min(50, list.length);

      ctx.res.write(list.slice(start, end).map(([_, hash]) => hash).join('\n'));
    }

    return next();
  }

  async function getJsonKeyValue(ctx, next) // jshint ignore:line
  {
    ctx.status = 500;

    ctx.res.write('not implemented');

    return next();
  }

  async function getSubscribeJsonKey(ctx, next) // jshint ignore:line
  {
    const {response, params: {key}} = ctx;

    response.set('Content-Type', 'application/octet-stream');
    response.set('Cache-Control', 'no-cache');

    ctx.status = 200;

    let count = 0,
        send = true;

    console.log(key, 'subscriber');

    ctx.res.on('close', () => {send = false; console.log('subscriber left');});

    // while (++count < 50)
    while (send) {
      const data = await getJsonKeyPromise(key); // jshint ignore:line
      console.log('sending json key', data);
      if (send) ctx.res.write(data);
    }

    console.log('done with subscribe');

    return next();
  }

  async function getSubscribeJsonKey(ctx, next) // jshint ignore:line
  {
    const {response, params: {key}} = ctx;

    response.set('Content-Type', 'application/octet-stream');
    response.set('Cache-Control', 'no-cache');

    ctx.status = 200;

    let count = 0,
        send = true;

    console.log(key, 'subscriber');

    ctx.res.on('close', () => {send = false; console.log('subscriber left');});

    // while (++count < 50)
    while (send) {
      const data = await getJsonKeyPromise(key); // jshint ignore:line
      console.log('sending json key', data);
      if (send) ctx.res.write(data);
    }

    console.log('done with subscribe');

    return next();
  }

  async function getSubscribeJsonKeyValue(ctx, next) // jshint ignore:line
  {
    const {response, params: {key}} = ctx;

    response.set('Content-Type', 'application/octet-stream');
    response.set('Cache-Control', 'no-cache');

    ctx.status = 200;

    ctx.res.write('not implemented!');

    return next();
  }

  async function getHash (ctx, next) // jshint ignore:line
  {
    const {hash} = ctx.params,
          data = await lookupHash(hashFnName, hash); // jshint ignore:line

    console.log(hash, 'requested');

    if (data) {
      ctx.body = data;
    }
    else ctx.response.status = 404;

    return next();
  }

  async function getHashJson(ctx, next) // jshint ignore:line
  {
    const {hash} = ctx.params,
          references = jsonHashReferences[hash];

    if (references) {
      const counts = Object.keys(references).reduce((agg, key) => {
        const r = references[key];

        agg[key] = r.length;

        return agg;
      }, {});

      ctx.body = JSON.stringify(counts);

      ctx.response.status = 200;
    }
    else ctx.response.status = 404;

    return next();
  }

  async function getHashJsonKey(ctx, next) // jshint ignore:line
  {
    const {key, hash} = ctx.params,
          references = jsonHashReferences[hash];

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

  async function postLookup (ctx, next) // jshint ignore:line
  {
    await new Promise((resolve, reject) => { // jshint ignore:line
      const {req, response} = ctx;

      req.on('data', data => {
        response.body = data.toString('utf16le').split('\n').reduce((body, hash) => {
          return `${body}${hash} ${keccakStore[hash]}\n`;
        }, response.body);
        response.status = 200;
      });

      req.on('end', resolve);
    });

    return next();
  }

  async function postHash (ctx, next) // jshint ignore:line
  {
    const {response, request, req, params: {hash}} = ctx;

    console.log(hash, 'posting');

    await readAndStore(req, response); // jshint ignore:line

    return next();

    function readAndStore(req, response) {
      return new Promise((resolve, reject) => {
        const buffer = [];

        let totalLength = 0;

        req.on('data', dataHandler);
        req.on('end', endHandler);

        function dataHandler(data) {
          totalLength += data.length;

          if (totalLength > maxLength) {
            if (req) {
              req.off('data', dataHandler);
              req.off('end', endHandler);
            }
            reject(`Too large! maxLength = ${maxLength}`);
          }

          buffer.push(data);
        }

        function endHandler() {
          const data = Buffer.concat(buffer).toString('utf8');

          if (keccak(data) === hash) {
            addToStore(keccakStore, hash, data)
              .then(() => addToLatest(hash))
              .then(() => addToFileSystem(hash, data)) // should probably just queue a write to file system
              .then(() => scheduleUpdateNotifications({listeners}, classify(hash, data), data))
              .then(() => {
                response.status = 200;
                console.log('stored', data);
                resolve();
              })
              .catch(error => {
                if (error === 'duplicate') response.status = 400;
                console.log('error', error);
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

function addToStore(store, hash, data) {
  return new Promise((resolve, reject) => {
    const bucket = (keccakStore[hash] = keccakStore[hash] || []);
console.log('add', bucket, data);
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i] === data) {
        return reject('duplicate');
      }
    }
console.log('adding');
    bucket.push(data);
    resolve();
  });
}

function addToLatest(hash) {
  const time = new Date().getTime();
  latest.unshift([time, hash]);
  scheduleLatestUpdate(hash);
  return new Promise((resolve, reject) => fs.write(latestFile, `${time} ${hash}\n`, error => error ? reject(error) : resolve()));
}

function addToFileSystem(hash, data) {
  const pieces = splitHash(hash);

  return createPiecesDirectories(pieces).then(path => writeFile(path, data));
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
  return tryClassifyJSON(hash, data, jsonHashReferences);
}

function tryClassifyJSON(hash, data, jsonHashReferences) {
  try {
    const object = JSON.parse(data),
          references = [];

    console.log('try classify', object);

    if (Array.isArray(object)) {

    }
    else if (typeof object === 'object') {
      for (let key in object) {
        const value = object[key],
              secondaryKeyBucket = (jsonKeyReferences[key] = jsonKeyReferences[key] || []);

        secondaryKeyBucket.push([new Date().getTime(), hash]);
        if (jsonKeyPromises[key]) scheduleJsonKeyUpdate(key, hash);

        if (typeof value === 'string') {
          const match = value.match(/^keccak:([0-9a-f]{64})$/);
          if (match) {
            console.log('match', match);
            const [_, referenceHash] = match,
                  referenceHashBucket = (jsonHashReferences[referenceHash] = jsonHashReferences[referenceHash] || {}),
                  keyBucket = (referenceHashBucket[key] = referenceHashBucket[key] || []);

            keyBucket.push(hash);
            references.push({[key]: [hash, referenceHash]});

            console.dir(jsonHashReferences);
          }
        }
      }
    }
    return references;
  }
  catch (e) {console.log('error classifying', e);}
}


let latestPromise;
function getLatestPromise() {
  if (!latestPromise) {
    const temp = {};
    latestPromise = new Promise(function(resolve, reject) {
      temp.resolve = resolve;
      temp.reject = reject;
    });
    latestPromise.resolve = temp.resolve;
    latestPromise.reject = temp.reject;
    latestPromise.buffer = [];
  }

  return latestPromise;
}

let jsonHashKeyPromises = {};
function getJsonHashKeyPromise(hash, key) {
  let hashPromises = (jsonHashKeyPromises[hash] = jsonHashKeyPromises[hash]) || {},
      keyPromise = hashPromises[key];

  if (!keyPromise) {
    const temp = {};
    keyPromise = new Promise(function(resolve, reject) {
      temp.resolve = resolve;
      temp.reject = reject;
    });
    keyPromise.resolve = temp.resolve;
    keyPromise.reject = temp.reject;
    keyPromise.buffer = [];
  }

  return keyPromise;
}

let jsonKeyPromises = {};
function getJsonKeyPromise(key) {
  let keyPromise = jsonKeyPromises[key];

  if (!keyPromise) {
    const temp = {};
    keyPromise = new Promise(function(resolve, reject) {
      temp.resolve = resolve;
      temp.reject = reject;
    });
    keyPromise.resolve = temp.resolve;
    keyPromise.reject = temp.reject;
    keyPromise.buffer = [];

    jsonKeyPromises[key] = keyPromise;

    console.log('jsonKeyPromise crated');
  }

  return keyPromise;
}

let jsonKeyValuePromises = {};
function getJsonKeyValuePromise(key, value) {
  let keyValuePromise = (jsonKeyValuePromises[key] = jsonKeyValuePromises[key] || {})[value];

  if (!keyValuePromise) {
    const temp = {};
    keyValuePromise = new Promise(function(resolve, reject) {
      temp.resolve = resolve;
      temp.reject = reject;
    });
    keyValuePromise.resolve = temp.resolve;
    keyValuePromise.reject = temp.reject;
    keyValuePromise.buffer = [];

    jsonKeyValuePromises[key][value] = keyValuePromise;

    console.log('jsonKeyPromise crated');
  }

  return keyValuePromise;
}

function scheduleLatestUpdate(hash) {
  const promise = getLatestPromise();
  promise.buffer.push(hash);

  if (promise.timer) {
    clearTimeout(promise.timer);
  }
  promise.timer = setTimeout(broadcastLatest, 1000 / 60);

  return promise;
}

function scheduleJsonKeyUpdate(key, referenceHash) {
  const promise = getJsonKeyPromise(key);
  promise.buffer.push(referenceHash);

  console.log('buffering', referenceHash);

  if (promise.timer) {
    clearTimeout(promise.timer);
  }
  promise.timer = setTimeout(() => broadcastJsonKey(key), 1000 / 60);

  return promise;
}

function broadcastLatest() {
  console.log('broadcast latest');
  const promise = getLatestPromise();
  if (promise.buffer.length > 0) {
    latestPromise = undefined;
    console.log('resolving');
    promise.resolve(promise.buffer.join('\n')); // ?
    promise.buffer.splice(0);
  }
}

function broadcastJsonKey(key) {
  console.log('broadcast', key);
  const promise = getJsonKeyPromise(key);
  if (promise.buffer.length > 0) {
    console.log(promise.buffer);
    delete jsonKeyPromises[key];
    console.log('resolving');
    promise.resolve(promise.buffer.join('\n')); // ?
    promise.buffer.splice(0);
  }
}
