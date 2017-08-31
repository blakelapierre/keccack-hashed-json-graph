import { h, Component } from 'preact';
import { Link } from 'preact-router/match';

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
        <Input />
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

    const detail = this;
    store.getData(hash)
         .then(data => detail.setState.call(detail, {data}))
         .catch(error => detail.setState.call(detail, {data: (<span>Not Found!</span>)}));
  }

  render({hash, store}, {data}) {
    if (hash !== this.state.hash) {
      const detail = this;

      store.getData(hash)
           .then(data => detail.setState.call(detail, {hash, data}))
           .catch(error => detail.setState.call(detail, {hash, data: (<span>Not Found!</span>)}));
    }

    const type = 'Raw';

    return (
      <info>
        <hash>{hash}</hash>
        {typeRenderer[type]({hash, data})}
      </info>
    );
  }
}

class Input extends Component {
  render() {
    return (
      <detail-input>
        input
      </detail-input>
    );
  }
}