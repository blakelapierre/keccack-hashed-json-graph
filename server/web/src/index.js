import http from 'http';

import {h, Component} from 'preact';
import render from 'preact-render-to-string';

import Koa from 'koa';
import Router from 'koa-trie-router';

const port = process.env.port || 8081;

const app = new Koa(),
      router = new Router();

router.get('/keccak/:hash', renderHash);

app.use(router.middleware());

app.listen(port);

console.log('HTTP server listing on port', port);

async function renderHash(ctx, next) // jshint ignore:line
{
  const {response, params: {hash}} = ctx;

  const html = await getData(hash) // jshint ignore:line
                      .then(renderData);
  
  ctx.body = `<!DOCTYPE html><html><head><title>fact.company</title></head><body>${html}</body></html>`;
  
  return next();
}

function getData(hash) {
  return new Promise((resolve, reject) => {
    return resolve(hash);
  });
}

function renderData(data) {
  return render(h('UI', {data}));
}