import style from './style';

import { Link } from 'preact-router/match';
import {Hash} from '../hash';

const Raw =
  ({hash, data, onClick, ...props}) => (
    <raw onClick={onClick}>
      <table>
        <tbody>
          <tr>
            <td><data>{renderLinks(data, props)}</data></td>
          </tr>
          <tr className={style['info']}>
            <td><Hash hash={hash} {...props} /></td>
          </tr>
        </tbody>
      </table>
    </raw>
  );

export {Raw};

function renderLinks(text = '', props) {
  const regexp = /(ftp|http|https|keccak):(\/\/)?([^ "]+)/ig,
        result = [];

  let match;
  while ((match = regexp.exec(text)) !== null) {

    const index = text.indexOf(match[0]),
          protocol = match[1],
          prev = text.substring(0, index),
          next = text.substring(index + match[0].length);

    result.push(prev);

    if (protocol === 'keccak') result.push(<Hash hash={match[3]} {...props} />);
    else result.push(<a href={match[0]} onClick={event => event.stopPropagation()} target="linkIframe">{match[0]}</a>);

    text = next;
  }

  result.push(text);

  return result;
}