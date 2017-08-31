import { h, Component } from 'preact';
import { Router } from 'preact-router';

import Header from './header';
import Home from '../routes/home';
import Detail from '../routes/detail';
import Profile from '../routes/profile';
// import Home from 'async!./home';
// import Profile from 'async!./profile';

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

const store = {
  transforms,
  data: {},
  addData: data =>
    new Promise((resolve, reject) => {
      const hash = kekkack(data),
            bucket = (store.data[hash] = store.data[hash] || []);

      bucket.push(data);

      resolve(data);
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
          <Detail store={store} path="/keccak/:hash" />
        </Router>
      </div>
    );
  }
}
