import { h, Component } from 'preact';
import style from './style';

import keccak from '../../lib/keccak.js';

const Text = ({text}) => <text>{text}</text>;
const TextJSON = ({text, json}) => <text-json><text>{text}</text><json>{json}</json></text-json>;
const HashTextJSON = ({hash, text, json}) => <hash-text-json><text>{text}</text><json>{json}</json><hash>{hash}</hash></hash-text-json>;
// const HashBucket = ({hash, children}) => <hash-bucket><hash>{hash}</hash>{...children}</hash-bucket>;

const transforms = {
  addData(hash, data, state) {
    const bucket = state.data[hash] = state.data[hash] || [];
    for (let i = 0; i < bucket.length; i++)
      if (JSON.stringify(bucket[i]) === JSON.stringify(data))
        return state;

    bucket.push(data);

    return state;
  }
};

function makeFullyHashed() {

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

export default class Home extends Component {
  state = {
    data: {}
  }

  onTextAdd(text) {
    const {hash, json} = hashObject({text});

    this.setState(transforms['addData'].bind(this, hash, {text, json}));

    return hash;
  }

  onTextTagsAdd(text, tags = []) {
    const hashed = {text: this.onTextAdd.call(this, text), tags: tags.map(tag => this.onTextAdd.call(this, tag.trim()))},
          {hash, json} = hashObject(hashed);

    this.setState(transforms['addData'].bind(this, hash, {...hashed, json}));
  }

  render({text, tags}, {data}) {
    return (
      <home>
        <container>
          <data>{Object.keys(data).map(k => data[k].map(d => <HashTextJSON hash={k} {...makeFullyUnhashed(data, d)} />))}</data>
        </container>

        <TextTagsInput text={text} tags={tags} onAdd={this.onTextTagsAdd.bind(this)} />
      </home>
    );
  }
}

const TextInput = ({text, onAdd}) => (
  <text-input>
    <textarea autofocus value={text} ref={el => this.textarea = el}></textarea>
    <button onClick={() => onAdd(this.textarea.value)}>Add</button>
  </text-input>
);

const TextTagsInput = ({text, tags, onAdd}) => (
  <text-input>
    <textarea autofocus value={text} ref={el => this.textarea = el}></textarea>
    <textarea value={tags} ref={el => this.tags = el}></textarea>
    <button onClick={() => onAdd(this.textarea.value, this.tags.value.split(','))}>Add</button>
  </text-input>
);


function hashObject(obj) {
  const json = JSON.stringify(obj),
        hash = `keccak:${keccak(json)}`;

  return {hash, json};
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