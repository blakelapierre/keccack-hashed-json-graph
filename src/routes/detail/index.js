import { h, Component } from 'preact';
import { Link, route } from 'preact-router/match';

import style from './style';

console.log(style);

const Raw = ({hash, data}) => (
  <raw>
    <table>
      <tbody>
        <tr>
          <td className={style['label']}>Data</td>
          <td><data>{renderKeccakLinks(data)}</data></td>
        </tr>
      </tbody>
    </table>
  </raw>
);


const Input = ({hash, store, object, route}) => (
  <detail-input>
    <about>About: {hash}</about>
    <inputs>
      <LabeledText object={object} />
    </inputs>
    <button onClick={() => store.addData(JSON.stringify(Object.assign({about: `keccak:${hash}`}, object))).then(({hash}) => route(`/keccak/${hash}`))}>Add</button>
  </detail-input>
);

const LabeledText = ({object}) => (
  <labeled-text>
    <table>
      <tbody>
        {Object.keys(object).map(key => (
          <tr>
            <td>{key}:</td>
            <td><textarea onInput={({target: {value}}) => (object[key] = value)}></textarea></td>
          </tr>
        ))}
      </tbody>
    </table>
  </labeled-text>
);

function renderKeccakLinks(text = '') {
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

const typeRenderer = {
  Raw
};

export default class Detail extends Component {
  render (props, {data}) {
    return (
      <detail>
        <View {...props} />
        <Input {...props} object={{'comment': ''}} />
        <Link href="/">&lt;--</Link>
      </detail>
    );
  }
}

class View extends Component {
  constructor(props) {
    super(props);

    const {hash, store} = props;

    this.state = {hash};

    this.load(store, hash, this);
  }

  load(store, hash, scope) {
    store.getData(hash)
         .then(data => scope.setState.call(scope, {hash, data}))
         .catch(error => scope.setState.call(scope, {hash, data: (<span>Not Found!</span>)}));
  }

  render({hash, store}, {data}) {
    const type = 'Raw';
console.log('hash', hash);
    if (hash !== this.state.hash) this.load(store, hash, this);

    return (
      <info>
        <hash>{hash}</hash>
        {typeRenderer[type]({hash, data})}
      </info>
    );
  }
}

// class Input extends Component {
//   render({hash, store}) {
//     return (
//       <detail-input>
//         About: {hash}
//         <textarea ref={el => this.textarea.el = el}></textarea>
//         <button onClick={() => {}}>Add</button>
//       </detail-input>
//     );
//   }
// }