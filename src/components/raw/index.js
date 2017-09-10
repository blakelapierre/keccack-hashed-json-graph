import style from './style';

import { Link } from 'preact-router/match';
import {Hash} from '../hash';

const Raw =
  ({hash, data, ...props}) => (
    <raw>
      <table>
        <tbody>
          <tr>
            <td><data>{renderKeccakLinks(data, props)}</data></td>
          </tr>
          <tr className={style['info']}>
            <td><Hash hash={hash} {...props} /></td>
          </tr>
        </tbody>
      </table>
    </raw>
  );

export {Raw};

function renderKeccakLinks(text = '', props) {
  const matches = text.match(/keccak:([0-9a-f]){64}/g),
        result = [];

  if (!matches) return text;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i],
          index = text.indexOf(match),
          prev = text.substring(0, index),
          hash = text.substring(index, index + 64 + 7);

    result.push(prev);
    result.push(<Link className={style['keccak-link']} href={`/keccak/${hash.substring(7)}`}><Hash hash={hash.substring(7)} {...props} /></Link>);

    text = text.substring(index + 64 + 7);
  }

  result.push(text);

  return result;
}