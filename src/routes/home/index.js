import { h, Component } from 'preact';
import { Link } from 'preact-router/match';
import style from './style';

import {Hash, ColorHash} from '../../components/hash';
import {Json} from '../../components/json';
import {Raw} from '../../components/raw';
import {TabPanel} from '../../components/tabPanel';

import keccak from '../../lib/keccak.js';

const host = window.location.hostname === 'localhost' ? 'localhost:9999' : 'db.fact.company';

const Text = ({text}) => <text>{text}</text>;
const TextJSON = ({text, json}) => <text-json><text>{text}</text><json>{json}</json></text-json>;
const HashTextJSON = ({hash, text, json}) => <hash-text-json><text>{text}</text><json>{json}</json><hash>{hash}</hash></hash-text-json>;
// const HashBucket = ({hash, children}) => <hash-bucket><hash>{hash}</hash>{...children}</hash-bucket>;

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

function post(url, data) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', url);
    xhr.addEventListener('load', () => resolve(xhr.responseText));
    xhr.addEventListener('error', reject);
    xhr.addEventListener('timeout', reject);
    xhr.send(data);
  });
}

function postLookup(hashes) {
  return post(`http://${host}/keccak/lookup`, hashes);
}


export default class Home extends Component {
  state = {
    log: [],
    delay: 500,
    failCount: 0
    // data: {}
    // data: this.props.store.data
  }

  constructor(props) {
    super();

    this.state.data = props.store.data;

    const home = this,
          {store} = props;

    this.store = store;

    // if (!this.latestSubscription) this.latestSubscription = subscribe();

    function subscribe() {
      return (
        store
          // .getSubscribeLatest(hashes => {
          .getSubscribeJsonKey('link', hashes => {
            console.log('hashes', hashes);
            hashes
              .reduce((promise, hash) =>
                !hash ? undefined
                      : store.getData(hash)
                             .then(data =>
                               setState(store.transforms['addData'].bind(home, hash, data)))
              , Promise.resolve())
          })
          .then(subscribe)
          .then(() => home.state.failCount = 0)
          .catch(() => setTimeout(subscribe, (home.state.delay = 100 * Math.pow(2, (home.state.failCount = (home.state.failCount || 0) + 1)))))
      );
    }

    function setState(state) {
      return home.setState.call(home, state);
    }
  }

  onTextAdd(text) {
    const {hashes, objects, jsons} = makeFullyHashed({text});

    for (let i = 0; i < hashes.length; i++) {
      console.log('settings', text, hashes[i], objects[i], jsons[i]);
      const hash = hashes[i].substring(7),
            json = jsons[i];

      if (this.state.data[hash] === undefined) {
        const xhr = new XMLHttpRequest();

        xhr.open('POST', `http://${host}/keccak/${hash}`, true);
        xhr.send(json);
      }

      this.setState(transforms['addData'].bind(this, hash, json));
    }

    return hashes;
  }

  onTextTagsAdd(text, tags) {
    const hashed = {text, tags},
          {hash, json} = hashObject(hashed),
          hashes = [hash],
          jsons = [json];
          // {hashes, jsons} = makeFullyHashed({text, tags});

    for (let i = 0; i < hashes.length; i++) {
      console.log('setting', text, hashes[i], jsons[i]);
      const hash = hashes[i].substring(7),
            json = jsons[i];

      if (this.state.data[hash] === undefined) {
        this.store.addData(json);
      }

      this.setState(this.props.store.transforms['addData'].bind(this, hash, json));
    }
  }


          //<data>{Object.keys(data).map(k => data[k].map(d => <HashTextJSON hash={k} {...makeFullyUnhashed(data, d)} />))}</data>
  render({text, tags, store, ...props}, {data}) {
    const {hosts, data: storeData, log} = store;
    return (
      <home>
        <left>
          <TabPanel>
            {hosts.map(host => (
              <container
                header={`db (${host})`}>
                <FilterView {...{store, ...props}} data={data} />
              </container>
            ))}
            <container
              header="localStorage">
              <DataView items={['ceec1972c7f3e92c0483c1d8fc1b50676176b877278d0157350dd41c51f0f14d']} data={{'ceec1972c7f3e92c0483c1d8fc1b50676176b877278d0157350dd41c51f0f14d':['456']}} {... props} />
            </container>
            <container
              header="store">
              <DataView items={log} data={storeData} {... props} />
            </container>
          </TabPanel>
        </left>
        <right>
          <TextTagsInput text={text} tags={tags} onAdd={this.onTextTagsAdd.bind(this)} />
        </right>
      </home>
    );
  }
}

class FilterView extends Component {
  state = {
    failCount: 0,
    filters: [],
    references: {},
    items: []
  }

  constructor(props) {
    super();

    this.state.data = props.data;
    this.store = props.store;

    this.setFilters();
  }

  setFilters(filters = []) {
    console.log('setting filters', filters, this.state.filters);
    if ((filters.length === 0 && this.state.filters.length === 0) ||
      !listsEqual(filters, this.state.filters)) {
      this.setState(state => {
        console.log('data', state.data);
        state.filters = filters;
        state.items.splice(0);
        return state;
      });
      console.log('setFilters', filters, this.state.filters);
      this.subscribe(filters);
    }
  }

  subscribe(filters) {
    const home = this,
          store = this.store,
          token = (this.token = this.token || {});

    if (this.token.cancel) this.token.cancel();

    console.log('subscribing', filters);

    return (this.subscription || Promise.resolve()).then(() => {
      const callback = hashes => {
        console.log('hashes', hashes);

        hashes
          .reverse()
          .reduce((promise, hash) =>
            !hash && !token.canceled ? promise
                  : store.getData(hash)
                         .then(data => setState(store.transforms['addData'].bind(home, hash, data)))
                         .then(() => store.getJsonReferences(hash))
                         .then(references => setState(state => {
                            state.references[hash] = references; // bad way to do this... will need to delete?
                            state.items.unshift(hash);
                            console.log('references', references);
                            return state;
                         }))
          , Promise.resolve())
          .catch(error => console.log('big error', error));
      };

      return this.subscription = new Promise((resolve, reject) => {
        (filters[0] || '' !== '' ? store.getSubscribeJsonKey(filters[0], callback, token) : store.getSubscribeLatest(callback, token))
          .then(() => home.state.failCount = 0)
          .then(() => {
            if (!token.canceled) {
              state.items.splice(0);
              home.subscribe.call(home, filters);
            }
          })
          .then(resolve)
          .catch(() => {
            console.log('subscription catch!', filters);
            if (!token.canceled) {
              setTimeout(() => {
                state.items.splice(0);
                home.subscribe.bind(home, filters);
              }, (home.state.delay = 100 * Math.pow(2, (home.state.failCount = (home.state.failCount || 0) + 1))));
              resolve();
            }
            else reject();
          });
        });
    });

    function setState(state) {
      return home.setState.call(home, state);
    }
  }

  render(props, {data = [], references, items}) {
    const {setFilters} = this;

    return (
      <filter-view>
        <FilterInput {...{setFilters: setFilters.bind(this), ...props}} />
        <DataView {...{...props, data, references, items}} />
      </filter-view>
    );
  }
}

function listsEqual(l1, l2) {
  if (l1.length !== l2.length) return false;
  for (let i = 0; i < l1.length; i++)
    if (l1[0] !== l2[0])
      return false;
  return true;
}

class FilterInput extends Component {
  state = {
    filters: []
  }

  addFilter() {
    const home = this,
          store = this.props.store;

    this.setState(state => {
      if (state.filters.indexOf(home.input.value) === -1) state.filters.push(home.input.value);
      return state;
    });

    this.props.setFilters(this.state.filters.slice());
  }

  removeFilter(filter) {
    this.setState(state => {
      const index = state.filters.indexOf(filter);
      if (index >= 0) state.filters.splice(index, 1);
      return state;
    });

    console.log('filter removed', filter, this.state.filters);
    this.props.setFilters(this.state.filters.slice());
  }

  render({}, {filters}) {
    return (
      <filter-input>
      {filters.map(filter => <filter><remove onClick={this.removeFilter.bind(this, filter)}>x</remove>{filter}</filter>)}
        <input type="text" onKeyUp={({which}) => which === 13 ? this.addFilter() : undefined} ref={el => this.input = el} value="" />
        <button onClick={this.addFilter.bind(this)}>+</button>
      </filter-input>
    );
  }
}

const DataView = ({data, items, route, ...props}) => (
  <db>
    {items.length}
    {items.map(hash => (data[hash] || []).map(d => <Json hash={hash} obj={JSON.parse(d)} onClick={() => route(`/keccak/${hash}`)} {...props} />))}
  </db>
  // <db>{items.map(hash => data[hash].map(d => <Raw hash={hash} data={d} onClick={() => route(`/keccak/${hash}`)} {...props} />))}</db>
);

const Data = () => (
  <data></data>
);

// {
//   hash,
//   data,
//   json,
//   object
// }


const TextInput = ({text, onAdd}) => (
  <text-input>
    <textarea autofocus value={text} ref={el => this.textarea = el}></textarea>
    <button onClick={() => onAdd(this.textarea.value)}>Add</button>
  </text-input>
);

const TextTagsInput = ({text, tags, onAdd}) => (
  <text-input>
    <div>
      <label>Text</label>
      <textarea autofocus value={text} ref={el => this.textarea = el}></textarea>
    </div>
    <div>
      <label>Tags (separate with commas)</label>
      <textarea value={tags} ref={el => this.tags = el}></textarea>
    </div>
    <button onClick={() => onAdd(this.textarea.value, this.tags.value.length > 0 ? this.tags.value.split(',') : undefined) & this.textarea.focus()}>Add</button>
  </text-input>
);


const makeHashString = data => `keccak:${keccak(data)}`;

function hashObject(obj) {
  const json = JSON.stringify(obj),
        hash = makeHashString(json);

  return {hash, json};
}

function makeFullyHashed(object) {
  const hashes = [],
        objects = [object],
        jsons = [];

  console.log('fully hashing', object);

  const {hash, json} = hashObject(Object.keys(object).reduce((hashed, key) => {
    const value = object[key];
console.log(key, value, typeof value);
    if (typeof value === 'string') {
      console.log('got string', value);
      const hash = makeHashString(value);
      hashed[key] = hash;
      hashes.push(hash);
      objects.push(value);
      jsons.push(undefined);
    }
    else if (Array.isArray(value)) {
      console.log('got array');
      const {hashes: h, objects: o, jsons: j} = makeFullyHashed(value);
      hashed[key] = hash;
      // hashes.push(hash);
      hashes.push(...h);
      objects.push(...o);
      jsons.push(...j);
    }
    else if (typeof value === 'object') {
      console.log('got object')
      const {hashes: h, objects: o, jsons: j} = makeFullyHashed(value);
      hashed[key] = hash;
      // hashes.push(hash);
      hashes.push(...h);
      objects.push(...o);
      jsons.push(...j);
    }

    return hashed;
  }, {}));

  hashes.unshift(hash);
  jsons.unshift(json);

  console.log('hash', hashes, objects, jsons);

  return {hashes, objects, jsons};
}

function makeFullyUnhashed(data, hashed, key) {
  console.log({data, hashed}, typeof hashed, key);
  if (typeof hashed === 'object') {
    return Object.keys(hashed).reduce((unhashed, key) => {
      unhashed[key] = makeFullyUnhashed(data, hashed[key], key);
      console.log(unhashed);
      return unhashed;
    }, {});
  }
  else if (typeof hashed === 'string') {
    if (key === 'json') return hashed; // shouldn't hardcode key name like this...
    if (hashed.indexOf('keccak:') === 0) return data[hashed][0][key];
  }
}

function unhashJSONToDepth(data, hashed, max_depth, depth = 0) {

}

function unhashJSONToDepthWithHandlers(data, handlers, hashed, max_depth, depth = 0) {

}


// text
// tags
// relationships
// annotations


// {
//   text: '',
//   tags: [],
//   relationships: {

//   }
// }


// types
//   text

//   relationship

//   tag


// {text: 'this is some text'}

// {text: 'this is some text', author: 'public_key'}

// {text: 'this is some text', author: 'public_key', created_at: new DateTime().getTimeUTC()}



function Server() {
  const addIndex = ({indices}, hash) => indices[hash] = [],
        addIndexOn = {};

}

// text
// json:reference


// organization
//   budgets?
//   tasks?
//   goals?
//   projects?
//   payments
//     bitcoin
//     dollars

// messageboard : organization
//   text
//   tags
//   references
//   author
//   signature

// reference
//   data
//   position
//   length

// tag
//   text
//   referece