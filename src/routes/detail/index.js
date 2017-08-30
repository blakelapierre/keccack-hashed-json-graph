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
          <td><data>{data}</data></td>
        </tr>
      </tbody>
    </table>
  </raw>
);

const typeRenderer = {
  Raw
};

export default class Detail extends Component {
  constructor(props) {
    super(props);

    const {hash, store} = props;

    this.state = {hash};

    const detail = this;
    store.getData(hash)
         .then(data => detail.setState.call(detail, {data}))
         .catch(error => detail.setState.call(detail, {data: (<span>Not Found!</span>)}))
  }
  render ({hash, store}, {data}) {
    const type = 'Raw';

    return (
      <detail>
        <info>
          <hash>{hash}</hash>
          {typeRenderer[type]({hash, data})}
        </info>
        <Link href="/">Return</Link>
      </detail>
    );
  }
}