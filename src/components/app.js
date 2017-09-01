import { h, Component } from 'preact';
import { Router, route } from 'preact-router';

import Header from './header';
import Home from '../routes/home';
import Detail from '../routes/detail';
import Profile from '../routes/profile';
// import Home from 'async!./home';
// import Profile from 'async!./profile';

console.log(Detail);

import keccak from '../lib/keccak.js';

const host = window.location.hostname === 'localhost' ? 'localhost:9999' : 'db.fact.company';


const transforms = {
  addData(hash, data, state) {
    const bucket = state.data[hash] = state.data[hash] || [];
    for (let i = 0; i < bucket.length; i++)
      if (bucket[i] === data)
        return state;

    bucket.push(data);

    return state;
  }
};


function storeData(hash, data) {
  return new Promise((resolve, reject) => {
    const bucket = (store.data[hash] = store.data[hash] || []);

    for (let i = 0; i < bucket.length; i++)
      if (data === bucket[i])
        return resolve();

    bucket.push(data);

    resolve();
  });
}

function storeDataOnServer(hash, data) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', `http://${host}/keccak/${hash}`, true);
    xhr.send(data);

    xhr.addEventListener('loadend', resolve);
    xhr.addEventListener('error', reject);
  });
}

function storeDataInLocalStorage(hash, data) {
  return new Promise((resolve, reject) => {
    if (localStorage) {
      const bucket = JSON.parse(localStorage[hash] || '[]');

      for (let i = 0; i < bucket.length; i++)
        if (data === bucket[i])
          return resolve();

      bucket.push(data);
      resolve();
    }
  });
}

const store = {
  transforms,
  data: {},
  jsonReferences: {},
  addData: data =>
    new Promise((resolve, reject) => {
      const hash = keccak(data);

      storeData(hash, data)
        .then(() => storeDataOnServer(hash, data))
        .then(() => storeDataInLocalStorage(hash, data))
        .then(() => resolve({hash, data}));
    }),

  getData: hash =>
    new Promise((resolve, reject) =>
      lookupInStore(store, hash)
        .then(resolve)
        .catch(() =>
          lookupInLocalStorage(hash)
            .then(data => {
              (store.data[hash] = store.data[hash] || []).push(data);
              return data;
            })
            .then(resolve)
            .catch(() =>
              lookupInServer(hash)
                .then(data => {
                  (store.data[hash] = store.data[hash] || []).push(data);
                  return data;
                })
                .then(resolve)
                .catch(reject))))
};

function lookupInStore(store, hash) {
  return new Promise((resolve, reject) => {
    const bucket = store.data[hash];

    if (bucket) resolve(bucket[0]);
    reject();
  });
}

function lookupInLocalStorage(hash) {
  return new Promise((resolve, reject) => {
    if (!localStorage) reject();

    const bucket = localStorage[hash];

    if (bucket) resolve(JSON.parse(bucket)[0]);
    else reject();
  });
}

function lookupInServer(hash) {
  return get(`http://${host}/keccak/${hash}`);
}


function get(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('GET', url);
    xhr.addEventListener('load', () => resolve(xhr.responseText));
    xhr.addEventListener('error', reject);
    xhr.addEventListener('timeout', reject);
    xhr.send();
  });
}

export default class App extends Component {
  /** Gets fired when the route changes.
   *  @param {Object} event   "change" event from [preact-router](http://git.io/preact-router)
   *  @param {string} event.url The newly routed URL
   */
  handleRoute = e => {
    this.currentUrl = e.url;
  };

  render() {
    return (
      <div id="app">
        <Router onChange={this.handleRoute}>
          <Home store={store} path="/" />
          <Detail store={store} route={route} path="/keccak/:hash" />
        </Router>
      </div>
    );
  }
}
