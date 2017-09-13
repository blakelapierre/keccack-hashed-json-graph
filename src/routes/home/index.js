import { h, Component } from 'preact';
import { Link } from 'preact-router/match';
import style from './style';

import {Hash, ColorHash} from '../../components/hash';
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

    if (!this.latestSubscription) this.latestSubscription = subscribe();

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
  render({text, tags, store: {hosts, data: storeData, log}, ...props}, {data}) {
    return (
      <home>
        <left>
          <TabPanel>
            {hosts.map(host => (
              <container
                header={`db (${host})`}>
                <DataView items={log} data={data} {...props} />
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

const DataView = ({data, items, route, ...props}) => (
  <db>{items.map(hash => data[hash].map(d => <Raw hash={hash} data={d} onClick={() => route(`/keccak/${hash}`)} {...props} />))}</db>
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