import { h, Component } from 'preact';
import { Link } from 'preact-router/match';
import style from './style';

import keccak from '../../lib/keccak.js';

const host = window.location.hostname === 'localhost' ? 'localhost:9999' : 'db.fact.company';

const Raw =
  ({hash, data}) => (
    <raw>
      <table>
        <tbody>
          <tr>
            <td className={style['label']}>Data</td>
            <td><data>{renderKeccakLinks(data)}</data></td>
          </tr>
          <tr>
            <td className={style['label']}>Hash</td>
            <td><hash>{hash}</hash></td>
          </tr>
        </tbody>
      </table>
    </raw>
  );

function renderKeccakLinks(text) {
  const matches = text.match(/keccak:([0-9a-f]){64}/g),
        result = [];

  if (!matches) return text;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i],
          index = text.indexOf(match),
          prev = text.substring(0, index),
          hash = text.substring(index, index + 64 + 7);

    result.push(prev);
    result.push(<Link className={style['keccak-link']} href={`/keccak/${hash.substring(7)}`}>{hash}</Link>);

    text = text.substring(index + 64 + 7);
  }

  result.push(text);

  return result;
}

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
    // data: {}
    // data: this.props.store.data
  }

  constructor(props) {
    super();

    this.state.data = props.store.data;

    const home = this,
          {store} = props;

    const {getContent, getLatest} = (data => ({
      getContent(hash) {
        const bucket = data[hash];
        return bucket ? new Promise((resolve, reject) => resolve(bucket[0])) : get(`http://${host}/keccak/${hash}`);
      },

      getLatest() {
        return get(`http://${host}/keccak/latest`);
      }
    }))(this.state.data);

    getLatest()
      .then(latest => {
        return latest.split('\n').reduce((promise, hash) => {
          return !hash ? undefined : promise
                                      .then(getContent.bind(undefined, hash))
                                      .then(data => home.setState.call(home, store.transforms['addData'].bind(home, hash, data)));
        }, Promise.resolve());
        // return postLookup(latest
        //             .split('\n')
        //             .map(line => line.split(',')[1])
        //             .join('\n') + '\n');
      })
      .catch(error => console.log('Get latest error!', error));
  }

  onTextAdd(text) {
    // const {hash, json} = hashObject({text});
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

  onTextTagsAdd(text, tags = []) {
    // const hashed = {text: this.onTextAdd.call(this, text), tags: tags.map(tag => this.onTextAdd.call(this, tag.trim()))},
    //       {hashes, jsons} = makeFullyHashed(hashed);
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
        const xhr = new XMLHttpRequest();

        xhr.open('POST', `http://${host}/keccak/${hash}`, true);
        xhr.send(json);
      }

      this.setState(this.props.store.transforms['addData'].bind(this, hash, json));
    }
    // this.setState(transforms['addData'].bind(this, hash, json));
  }


          //<data>{Object.keys(data).map(k => data[k].map(d => <HashTextJSON hash={k} {...makeFullyUnhashed(data, d)} />))}</data>
  render({text, tags}, {data}) {
    return (
      <home>
        <TabPanel>
          <container
            header="Raw">
            <data>{Object.keys(data).map(k => data[k].map(d => <Link href={`/keccak/${k}`}><Raw hash={k} data={d} /></Link>))}</data>
          </container>
        </TabPanel>

        <TextTagsInput text={text} tags={tags} onAdd={this.onTextTagsAdd.bind(this)} />
      </home>
    );
  }
}

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
      <div>Text</div>
      <textarea autofocus value={text} ref={el => this.textarea = el}></textarea>
    </div>
    <div>
      <div>Tags (separate with commas)</div>
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

class TabPanel extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selected: 0
    };
  }

  render({children, className}) {
    const {selected} = this.state;
    return (
      <tab-panel className={style[className]}>
        {children[selected]}
        <panels>
          {children.map(({attributes: { header }}, i) =>
            <selector
              className={selected === i ? style['selected'] : ''}
              onClick={() => this.setState({selected: i})}
              >{header}</selector>)}
        </panels>
      </tab-panel>
    );
  }
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